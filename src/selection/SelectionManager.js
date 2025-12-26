class SelectionManager {
    constructor(config) {
        this.getBits = config.getBits;
        this.bitsManager = config.bitsManager;
        this.mainCanvasManager = config.mainCanvasManager;
        this.isShankVisible = config.isShankVisible;
        this.onSelectionChange = config.onSelectionChange || (() => {});

        this.selectedIndices = [];
    }

    getSelectedIndices() {
        return [...this.selectedIndices];
    }

    isSelected(index) {
        return this.selectedIndices.includes(index);
    }

    toggleSelection(index) {
        if (this.isSelected(index)) {
            this.deselect(index);
        } else {
            this.select(index);
        }
        this.onSelectionChange();
    }

    clearSelection() {
        this.selectedIndices.forEach((index) => this.resetBitHighlight(index));
        this.selectedIndices = [];
        this.onSelectionChange();
    }

    handleDelete(index) {
        this.selectedIndices = this.selectedIndices
            .filter((selectedIndex) => selectedIndex !== index)
            .map((selectedIndex) =>
                selectedIndex > index ? selectedIndex - 1 : selectedIndex
            );
        this.onSelectionChange();
    }

    handleReorder(srcIndex, destIndex) {
        this.selectedIndices = this.selectedIndices.map((selectedIndex) => {
            if (selectedIndex === srcIndex) {
                return destIndex;
            } else if (selectedIndex > srcIndex && selectedIndex <= destIndex) {
                return selectedIndex - 1;
            } else if (selectedIndex >= destIndex && selectedIndex < srcIndex) {
                return selectedIndex + 1;
            }
            return selectedIndex;
        });
        this.onSelectionChange();
    }

    select(index) {
        this.selectedIndices.push(index);
        this.highlightBit(index);
    }

    deselect(index) {
        this.selectedIndices = this.selectedIndices.filter(
            (selectedIndex) => selectedIndex !== index
        );
        this.resetBitHighlight(index);
    }

    highlightBit(index) {
        const bits = this.getBits();
        const bit = bits[index];
        if (!bit || !bit.group) return;

        const shapeGroup = bit.group.querySelector("g");
        if (!shapeGroup) return;

        const bitDataWithDisplayColor = {
            ...bit.bitData,
            fillColor: bit.color,
        };
        const newShapeGroup = this.bitsManager.createBitShapeElement(
            bitDataWithDisplayColor,
            bit.groupName,
            bit.baseAbsX,
            bit.baseAbsY,
            true
        );

        bit.group.replaceChild(newShapeGroup, shapeGroup);

        const newBitShape = newShapeGroup.querySelector(".bit-shape");
        const newShankShape = newShapeGroup.querySelector(".shank-shape");
        const thickness = Math.max(
            0.1,
            0.5 / Math.sqrt(this.mainCanvasManager.zoomLevel)
        );

        if (newBitShape) {
            newBitShape.setAttribute("stroke", "#00BFFF");
            newBitShape.setAttribute("stroke-width", thickness);
        }
        if (newShankShape) {
            newShankShape.setAttribute("stroke", "#00BFFF");
            newShankShape.setAttribute("stroke-width", thickness);
        }
    }

    resetBitHighlight(index) {
        const bits = this.getBits();
        const bit = bits[index];
        if (!bit || !bit.group) return;

        const shapeGroup = bit.group.querySelector("g");
        if (!shapeGroup) return;

        const bitDataWithDisplayColor = {
            ...bit.bitData,
            fillColor: bit.color,
        };
        const newShapeGroup = this.bitsManager.createBitShapeElement(
            bitDataWithDisplayColor,
            bit.groupName,
            bit.baseAbsX,
            bit.baseAbsY,
            false
        );

        bit.group.replaceChild(newShapeGroup, shapeGroup);

        const thickness = Math.max(
            0.1,
            0.5 / Math.sqrt(this.mainCanvasManager.zoomLevel)
        );
        const newBitShape = newShapeGroup.querySelector(".bit-shape");
        const newShankShape = newShapeGroup.querySelector(".shank-shape");

        if (newBitShape) {
            newBitShape.setAttribute("stroke-width", thickness);
        }
        if (newShankShape) {
            newShankShape.setAttribute("stroke", "black");
            newShankShape.setAttribute("stroke-width", thickness);
            newShankShape.style.display = this.isShankVisible()
                ? "block"
                : "none";
        }
    }
}

export default SelectionManager;
