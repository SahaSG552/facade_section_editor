// Router bit database (updated with more detailed parameters)
const routerBits = {
  cylindrical: [
    { name: "D10H20", diameter: 10, length: 20 },
    { name: "D12H25", diameter: 12, length: 25 },
  ],
  conical: [
    { name: "V90D25", diameter: 25, length: 15, angle: 90 },
    { name: "V120D32", diameter: 32, length: 20, angle: 120 },
  ],
  ballNose: [
    { name: "U10", diameter: 10, length: 20 },
    { name: "U19", diameter: 19, length: 25 },
    { name: "U38", diameter: 38, length: 38 },
  ],
};

// SVG namespace
const svgNS = "http://www.w3.org/2000/svg";

// Get DOM elements
const bitGroups = document.getElementById("bit-groups");
const canvas = document.getElementById("canvas");
const materialWidthInput = document.getElementById("material-width");
const materialThicknessInput = document.getElementById("material-thickness");

// Global variables for material shape
let materialRect;
let materialWidth = 400;
let materialThickness = 18;

const canvasParameters = {
  width: canvas.getAttribute("width"),
  height: canvas.getAttribute("height"),
};

// Create SVG icon
function createSVGIcon(shape, params, size = 50) {
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("width", size);
  svg.setAttribute("height", size);
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);

  const circle = document.createElementNS(svgNS, "circle");
  circle.setAttribute("cx", size / 2);
  circle.setAttribute("cy", size / 2);
  circle.setAttribute("r", size / 2 - 1);
  circle.setAttribute("fill", "white");
  circle.setAttribute("stroke", "black");
  circle.setAttribute("stroke-width", "2");
  svg.appendChild(circle);

  const innerGroup = document.createElementNS(svgNS, "g");
  innerGroup.setAttribute("transform", `translate(${size / 4}, ${size / 4})`);

  let innerShape;
  switch (shape) {
    case "cylindrical":
      innerShape = document.createElementNS(svgNS, "rect");
      innerShape.setAttribute("width", size / 2);
      innerShape.setAttribute("height", size / 2);
      break;
    case "conical":
      innerShape = document.createElementNS(svgNS, "polygon");
      innerShape.setAttribute(
        "points",
        `0,${size / 2} ${size / 4},0 ${size / 2},${size / 2}`
      );
      break;
    case "ballNose":
      innerShape = document.createElementNS(svgNS, "path");
      innerShape.setAttribute(
        "d",
        `M0,${size / 2} Q${size / 4},0 ${size / 2},${size / 2}`
      );
      break;
    default:
      if (params) {
        // Create specific bit shape based on parameters
        innerShape = createBitShape(shape, params, size / 2);
      }
  }

  if (innerShape) {
    innerShape.setAttribute("fill", "white");
    innerShape.setAttribute("stroke", "black");
    innerShape.setAttribute("stroke-width", "2");
    innerGroup.appendChild(innerShape);
  }

  svg.appendChild(innerGroup);
  return svg;
}

// Create specific bit shape
function createBitShape(groupName, params, size) {
  let shape;
  switch (groupName) {
    case "cylindrical":
      shape = document.createElementNS(svgNS, "rect");
      shape.setAttribute("width", params.diameter * (size / 20));
      shape.setAttribute("height", params.length * (size / 20));
      shape.setAttribute("x", (size - params.diameter * (size / 20)) / 2);
      shape.setAttribute("y", 0);
      break;
    case "conical":
      const halfWidth = (params.diameter * (size / 20)) / 2;
      const height = params.length * (size / 20);
      shape = document.createElementNS(svgNS, "polygon");
      shape.setAttribute(
        "points",
        `${size / 2},0 ${size / 2 - halfWidth},${height} ${
          size / 2 + halfWidth
        },${height}`
      );
      break;
    case "ballNose":
      shape = document.createElementNS(svgNS, "path");
      const radius = (params.diameter * (size / 20)) / 2;
      shape.setAttribute(
        "d",
        `M${size / 2 - radius},${size} A${radius},${radius} 0 0,1 ${
          size / 2 + radius
        },${size}`
      );
      break;
  }
  return shape;
}

// Create action icon
function createActionIcon(action) {
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("width", "15");
  svg.setAttribute("height", "15");
  svg.setAttribute("viewBox", "0 0 24 24");

  const circle = document.createElementNS(svgNS, "circle");
  circle.setAttribute("cx", "12");
  circle.setAttribute("cy", "12");
  circle.setAttribute("r", "11");
  circle.setAttribute("fill", "white");
  circle.setAttribute("stroke-width", "2");

  const path = document.createElementNS(svgNS, "path");
  path.setAttribute("fill", "black");

  switch (action) {
    case "edit":
      circle.setAttribute("stroke", "green");
      path.setAttribute(
        "d",
        "M16.293 2.293l3.414 3.414-13 13-3.414-3.414 13-13zM18 10v8h-8v-8h8z"
      );
      break;
    case "copy":
      circle.setAttribute("stroke", "orange");
      path.setAttribute(
        "d",
        "M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"
      );
      break;
    case "remove":
      circle.setAttribute("stroke", "red");
      path.setAttribute(
        "d",
        "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
      );
      break;
  }

  svg.appendChild(circle);
  svg.appendChild(path);
  return svg;
}

// Create bit groups
function createBitGroups() {
  for (const [groupName, bits] of Object.entries(routerBits)) {
    const groupDiv = document.createElement("div");
    groupDiv.className = "bit-group";

    const groupIcon = createSVGIcon(groupName);
    groupDiv.appendChild(groupIcon);

    const bitList = document.createElement("div");
    bitList.className = "bit-list";

    bits.forEach((bit) => {
      const bitDiv = document.createElement("div");
      bitDiv.className = "bit";

      const bitName = document.createElement("span");
      bitName.textContent = bit.name;
      bitDiv.appendChild(bitName);

      const bitIcon = createSVGIcon(groupName, bit, 40);
      bitDiv.appendChild(bitIcon);

      const actionIcons = document.createElement("div");
      actionIcons.className = "action-icons";
      ["edit", "copy", "remove"].forEach((action) => {
        const actionIcon = createActionIcon(action);
        actionIcon.addEventListener("click", (e) => {
          e.stopPropagation();
          console.log(`${action} clicked for ${bit.name}`);
          // Implement action functionality here
        });
        actionIcons.appendChild(actionIcon);
      });
      bitDiv.appendChild(actionIcons);

      bitDiv.addEventListener("click", () => drawBitShape(bit, groupName));
      bitList.appendChild(bitDiv);
    });

    groupDiv.appendChild(bitList);

    groupDiv.addEventListener(
      "mouseenter",
      () => (bitList.style.display = "flex")
    );
    groupDiv.addEventListener(
      "mouseleave",
      () => (bitList.style.display = "none")
    );

    bitGroups.appendChild(groupDiv);
  }
}

// Initialize SVG elements
function initializeSVG() {
  // Create material rectangle
  materialRect = document.createElementNS(svgNS, "rect");
  canvas.appendChild(materialRect);

  // Create a group for bit shapes
  const bitGroup = document.createElementNS(svgNS, "g");
  bitGroup.id = "bit-group";
  canvas.appendChild(bitGroup);

  // Initial draw of material shape
  updateMaterialShape();
}

// Draw material shape
function updateMaterialShape() {
  // Clear previous shapes
  canvas.getElementsByTagNameNS(svgNS, "rect")[0].remove();
  console.log(canvas.children);
  console.log(canvas.getElementsByTagNameNS(svgNS, "rect"));

  // Create rectangle
  const rect = document.createElementNS(svgNS, "rect");
  rect.setAttribute("x", (canvasParameters.width - materialWidth) / 2);
  rect.setAttribute("y", (canvasParameters.height - materialThickness) / 2);
  rect.setAttribute("width", materialWidth);
  rect.setAttribute("height", materialThickness);
  rect.setAttribute("fill", "rgba(155, 155, 155, 0.16)");
  rect.setAttribute("stroke", "black");

  canvas.appendChild(rect);
}

// Update material parameters
function updateMaterialParams() {
  materialWidth = parseInt(materialWidthInput.value);
  materialThickness = parseInt(materialThicknessInput.value);
  updateMaterialShape();
}

// Draw bit shape
function drawBitShape(bit, groupName) {
  const bitGroup = document.getElementById("bit-group");
  bitGroup.innerHTML = ""; // Clear previous bit shapes

  updateMaterialParams();
  const centerX = (canvasParameters.width - materialWidth) / 2;
  const centerY = canvasParameters.height / 2 - materialThickness / 2;

  //*! Remove previous bit shape
  /* const previousBit = canvas.querySelector(".bit-shape");
  if (previousBit) {
    previousBit.remove();
  } */

  let shape;
  switch (groupName) {
    case "cylindrical":
      shape = document.createElementNS(svgNS, "rect");
      shape.setAttribute("x", centerX - bit.diameter / 2);
      shape.setAttribute("y", centerY - bit.length);
      shape.setAttribute("width", bit.diameter);
      shape.setAttribute("height", bit.length);
      shape.setAttribute("fill", "rgba(0, 140, 255, 0.30)");

      break;
    case "conical":
      const oppositeAngle = bit.angle;
      const hypotenuse = bit.diameter;
      const angleRad = (oppositeAngle * Math.PI) / 180;

      // Вычисляем высоту треугольника
      const height = (hypotenuse / 2) * (1 / Math.tan(angleRad / 2));

      // Вычисляем половину основания
      const halfBase = (Math.cos(angleRad) * hypotenuse) / 2;
      console.log(oppositeAngle, hypotenuse, height, halfBase);
      // Определяем координаты вершин
      const points = [
        `${centerX},${centerY}`,
        `${centerX - hypotenuse / 2},${centerY - height}`,
        `${centerX + hypotenuse / 2},${centerY - height}`,
      ].join(" ");

      /* const points = `${centerX},${centerY} 
                            ${centerX - bit.diameter / 2},${
        centerY - bit.length
      } 
                            ${centerX + bit.diameter / 2},${
        centerY - bit.length
      }`; */
      shape = document.createElementNS(svgNS, "polygon");
      shape.setAttribute("points", points);
      shape.setAttribute("fill", "rgba(26, 255, 0, 0.30)");
      break;
    case "ballNose":
      shape = document.createElementNS(svgNS, "circle");
      shape.setAttribute("cx", centerX);
      shape.setAttribute("cy", centerY - bit.diameter / 2);
      shape.setAttribute("r", bit.diameter / 2);
      shape.setAttribute("fill", "rgba(255, 0, 0, 0.30)");
      break;
  }

  shape.setAttribute("stroke", "black");
  shape.classList.add("bit-shape");
  //shape.setAttribute("name", bit.name);
  canvas.appendChild(shape);
}

// Initialize
function initialize() {
  createBitGroups();
  initializeSVG();
  //!updateMaterialShape();

  // Add event listeners for material parameter inputs
  materialWidthInput.addEventListener("input", updateMaterialParams);
  materialThicknessInput.addEventListener("input", updateMaterialParams);
}

// Call initialize function when the page loads
window.addEventListener("load", initialize);
