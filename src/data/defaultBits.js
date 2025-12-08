export default {
    cylindrical: [
        { id: "cyl-1", name: "D10H20", diameter: 10, length: 20 },
        { id: "cyl-2", name: "D12H25", diameter: 12, length: 25 },
    ],
    conical: [
        { id: "con-1", name: "V90D25", diameter: 25.4, length: 19, angle: 90 },
        {
            id: "con-2",
            name: "V120D32",
            diameter: 32,
            length: 13.2,
            angle: 120,
        },
        {
            id: "con-3",
            name: "V120D50",
            diameter: 50,
            length: 20.6,
            angle: 120,
        },
    ],
    ballNose: [
        { id: "bn-1", name: "U10", diameter: 10, length: 20, height: 5 },
        { id: "bn-2", name: "U19", diameter: 19, length: 25, height: 9.5 },
        { id: "bn-3", name: "U38", diameter: 38.1, length: 22, height: 19.05 },
    ],
    fillet: [
        {
            id: "fil-1",
            name: "D10R2",
            diameter: 10,
            length: 20,
            height: 5,
            cornerRadius: 2,
            flat: 0,
        },
        {
            id: "fil-2",
            name: "D12R3F2",
            diameter: 12,
            length: 25,
            height: 8,
            cornerRadius: 3,
            flat: 2,
        },
    ],
};
