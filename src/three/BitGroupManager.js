/**
 * BitGroupManager - Simplified version without union operations
 * 
 * Основная задача:
 * 1. Создавать массив bitGroup, содержащий фрезу, расширения и фантомы
 * 2. Все меши принадлежащие ко фрезе группируются вместе
 * 3. Перед CSG передается массив всех мешей (без union)
 */

import * as THREE from 'three';
import LoggerFactory from '../core/LoggerFactory.js';

export default class BitGroupManager {
    constructor() {
        this.log = LoggerFactory.createLogger("BitGroupManager");
        
        // Массив групп фрез
        // Каждая группа: {
        //     bitIndex: номер фрезы,
        //     bit: {object} основная фреза,
        //     extensions: {Array} массив расширений,
        //     phantoms: {Array} массив фантомов,
        //     meshes: {Array} все меши группы
        // }
        this.bitGroups = [];
    }

    /**
     * Создает группы фрез из массива bitExtrudeMeshes
     * @param {Array} bitExtrudeMeshes - Массив всех мешей фрез
     * @returns {Array} - Массив сгруппированных фрез
     */
    createBitGroups(bitExtrudeMeshes) {
        this.log.info("Creating bit groups from meshes:", bitExtrudeMeshes.length);
        
        // Очищаем предыдущие группы
        this.bitGroups = [];
        
        // Группируем меши по bitIndex и типу
        const meshesByBitIndex = new Map();
        
        bitExtrudeMeshes.forEach(mesh => {
            const bitIndex = mesh.userData?.bitIndex;
            if (bitIndex === undefined) {
                this.log.warn("Mesh missing bitIndex, skipping:", mesh);
                return;
            }
            
            if (!meshesByBitIndex.has(bitIndex)) {
                meshesByBitIndex.set(bitIndex, []);
            }
            meshesByBitIndex.get(bitIndex).push(mesh);
        });

        // Создаем группы для каждого bitIndex
        for (const [bitIndex, meshes] of meshesByBitIndex) {
            const group = this.createGroupForBit(bitIndex, meshes);
            if (group) {
                this.bitGroups.push(group);
            }
        }

        // Сортируем группы по bitIndex для стабильности
        this.bitGroups.sort((a, b) => a.bitIndex - b.bitIndex);

        this.log.info(`Created ${this.bitGroups.length} bit groups`);
        this.bitGroups.forEach(group => {
            this.log.debug(`Bit ${group.bitIndex}: ${group.bit.length} bits, ${group.extensions.length} extensions, ${group.phantoms.length} phantoms`);
        });

        return this.bitGroups;
    }

    /**
     * Создает группу для одной фрезы
     * @param {number} bitIndex 
     * @param {Array} meshes - Все меши для этого bitIndex
     * @returns {Object|null} - Группа фрезы
     */
    createGroupForBit(bitIndex, meshes) {
        const group = {
            bitIndex: bitIndex,
            bit: [],
            extensions: [],
            phantoms: [],
            meshes: []
        };

        // Классифицируем меши
        meshes.forEach(mesh => {
            const operation = mesh.userData?.operation || 'subtract';
            const isPhantom = mesh.userData?.isPhantom || false;
            const isExtension = mesh.userData?.isExtension || false;

            if (isPhantom) {
                group.phantoms.push(mesh);
            } else if (isExtension) {
                group.extensions.push(mesh);
            } else {
                // Основная фреза
                group.bit.push(mesh);
            }

            // Добавляем в общий массив всех мешей
            group.meshes.push(mesh);
        });

        // Проверяем, что у нас есть хотя бы основная фреза
        if (group.bit.length === 0) {
            this.log.warn(`Bit ${bitIndex} has no main bit mesh, using first valid mesh as main`);
            if (group.meshes.length > 0) {
                group.bit.push(group.meshes[0]);
            }
        }

        return group;
    }

    /**
     * Возвращает все меши из всех групп (без union)
     * @returns {Array} - Все меши для CSG
     */
    getAllMeshes() {
        const allMeshes = [];
        
        this.bitGroups.forEach(group => {
            group.meshes.forEach(mesh => {
                // Устанавливаем metadata для CSG
                mesh.userData.bitIndex = group.bitIndex;
                mesh.userData.isBitGroup = true;
                mesh.userData.originalBitCount = group.bit.length + group.extensions.length + group.phantoms.length;
                mesh.userData.componentTypes = {
                    bit: group.bit.length,
                    extensions: group.extensions.length,
                    phantoms: group.phantoms.length
                };
                
                allMeshes.push(mesh);
            });
        });

        this.log.info(`Returning ${allMeshes.length} meshes from ${this.bitGroups.length} groups for CSG`);
        return allMeshes;
    }

    /**
     * Фильтрует группы, пересекающиеся с панелью
     * @param {Array} groups - Группы для фильтрации
     * @param {THREE.Box3} panelBBox - Bounding box панели
     * @returns {Array} - Отфильтрованные группы
     */
    filterIntersectingGroups(groups, panelBBox) {
        if (!groups || !panelBBox) return [];

        const intersectingGroups = [];
        groups.forEach(group => {
            let groupIntersects = false;
            
            // Check if any mesh in this group intersects with the panel
            group.meshes.forEach(mesh => {
                if (!mesh || !mesh.geometry) return;
                
                const bbox = new THREE.Box3().setFromBufferAttribute(mesh.geometry.attributes.position);
                bbox.applyMatrix4(mesh.matrixWorld);

                if (bbox.intersectsBox(panelBBox)) {
                    groupIntersects = true;
                }
            });
            
            // If any mesh in the group intersects, include the entire group
            if (groupIntersects) {
                intersectingGroups.push(group);
            }
        });

        this.log.info(`Filtered to ${intersectingGroups.length} intersecting groups (from ${groups.length} total groups)`);
        return intersectingGroups;
    }

    /**
     * Получает все группы
     * @returns {Array} - Массив групп
     */
    getBitGroups() {
        return this.bitGroups;
    }

    /**
     * Получает группу по индексу фрезы
     * @param {number} bitIndex 
     * @returns {Object|null} - Группа или null
     */
    getGroupByBitIndex(bitIndex) {
        return this.bitGroups.find(group => group.bitIndex === bitIndex) || null;
    }

    /**
     * Очищает все группы и освобождает память
     */
    dispose() {
        this.log.info("Disposing BitGroupManager");
        this.bitGroups = [];
    }

    /**
     * Логирует диагностику групп
     */
    logDiagnostics() {
        this.log.info("=== Bit Groups Diagnostics ===");
        this.log.info(`Total groups: ${this.bitGroups.length}`);
        
        let totalBits = 0;
        let totalExtensions = 0;
        let totalPhantoms = 0;
        
        this.bitGroups.forEach(group => {
            totalBits += group.bit.length;
            totalExtensions += group.extensions.length;
            totalPhantoms += group.phantoms.length;
            
            this.log.info(`Group ${group.bitIndex}: ${group.bit.length} bits, ${group.extensions.length} extensions, ${group.phantoms.length} phantoms`);
        });
        
        this.log.info(`Summary: ${totalBits} bits, ${totalExtensions} extensions, ${totalPhantoms} phantoms`);
        this.log.info("=== End Diagnostics ===");
    }
}