/*
  Add the approved render images to assets/renders/ using the filenames below.
  The fixed camera sequence, room names, material details and image positions can
  all be edited here without changing the page structure.
*/
const cameras = [
  {
    id: "01", room: "Living room", zone: "Public living", description: "Living room toward the garden terrace",
    image: "assets/renders/camera-01.jpg",
    materials: [
      { name: "Floor finish", category: "FLOORING", description: "Add the confirmed floor finish, format and installation notes for this view.", maker: "To be confirmed", finish: "To be confirmed", location: "Living room", x: 29, y: 79 },
      { name: "Wall finish", category: "WALL FINISH", description: "Add the confirmed wall paint or surface treatment.", maker: "To be confirmed", finish: "To be confirmed", location: "Living room", x: 78, y: 44 }
    ]
  },
  {
    id: "02", room: "Dining area", zone: "Dining", description: "Dining area looking back toward the living room",
    image: "assets/renders/camera-02.jpg",
    materials: [
      { name: "Floor finish", category: "FLOORING", description: "Add the confirmed floor finish and product reference.", maker: "To be confirmed", finish: "To be confirmed", location: "Dining area", x: 36, y: 79 },
      { name: "Joinery", category: "CUSTOM JOINERY", description: "Add the confirmed material and finish for the dining joinery.", maker: "To be confirmed", finish: "To be confirmed", location: "Dining area", x: 76, y: 54 }
    ]
  },
  {
    id: "03", room: "Kitchen", zone: "Kitchen", description: "Kitchen and island from the living space",
    image: "assets/renders/camera-03.jpg",
    materials: [
      { name: "Cabinet fronts", category: "JOINERY", description: "Add the confirmed cabinet material, colour and sheen.", maker: "To be confirmed", finish: "To be confirmed", location: "Kitchen", x: 69, y: 43 },
      { name: "Countertop", category: "WORKTOP", description: "Add the confirmed worktop material and product reference.", maker: "To be confirmed", finish: "To be confirmed", location: "Kitchen", x: 43, y: 70 }
    ]
  },
  {
    id: "04", room: "Master bedroom", zone: "Private rooms", description: "Master bedroom from the room entrance",
    image: "assets/renders/camera-04.jpg",
    materials: [
      { name: "Wardrobe finish", category: "JOINERY", description: "Add the confirmed wardrobe material and finish.", maker: "To be confirmed", finish: "To be confirmed", location: "Master bedroom", x: 75, y: 38 },
      { name: "Bed wall finish", category: "WALL FINISH", description: "Add the confirmed material details for the bed wall.", maker: "To be confirmed", finish: "To be confirmed", location: "Master bedroom", x: 43, y: 57 }
    ]
  },
  {
    id: "05", room: "Bedroom 02", zone: "Private rooms", description: "Bedroom 02, viewed from the doorway",
    image: "assets/renders/camera-05.jpg",
    materials: [
      { name: "Wardrobe glass", category: "GLAZING", description: "Add the confirmed glass type, tint and supplier.", maker: "To be confirmed", finish: "To be confirmed", location: "Bedroom 02", x: 72, y: 42 },
      { name: "Floor finish", category: "FLOORING", description: "Add the confirmed floor finish and product reference.", maker: "To be confirmed", finish: "To be confirmed", location: "Bedroom 02", x: 30, y: 79 }
    ]
  }
];

const markers = [...document.querySelectorAll(".camera-marker")];
const image = document.getElementById("render-image");
const fallback = document.getElementById("render-fallback");
const roomLabel = document.getElementById("render-room-label");
const viewNumber = document.getElementById("view-number");
const viewKicker = document.getElementById("view-kicker");
const viewDescription = document.getElementById("view-description");
const hotspotLayer = document.getElementById("hotspot-layer");
const dialog = document.getElementById("material-dialog");
let currentIndex = 0;
let imageRequest = 0;

function updateCamera(index, moveFocus = false) {
  currentIndex = (index + cameras.length) % cameras.length;
  const camera = cameras[currentIndex];
  const requestId = ++imageRequest;

  markers.forEach((marker, markerIndex) => {
    const active = markerIndex === currentIndex;
    marker.classList.toggle("is-active", active);
    marker.setAttribute("aria-pressed", String(active));
    if (active && moveFocus) marker.focus();
  });

  roomLabel.textContent = camera.room.toUpperCase();
  viewNumber.innerHTML = `${camera.id} <span>/ 0${cameras.length}</span>`;
  viewKicker.textContent = `CAMERA ${camera.id} · ${camera.zone.toUpperCase()}`;
  viewDescription.textContent = camera.description;
  document.querySelector(".render-frame").setAttribute("aria-label", `Camera ${camera.id}: ${camera.room}`);
  hotspotLayer.replaceChildren();

  camera.materials.forEach((material, materialIndex) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "material-hotspot";
    button.style.left = `${material.x}%`;
    button.style.top = `${material.y}%`;
    button.setAttribute("aria-label", `Material ${materialIndex + 1}: ${material.name}`);
    button.textContent = "✳";
    button.addEventListener("click", () => openMaterial(material));
    hotspotLayer.append(button);
  });

  fallback.hidden = false;
  image.hidden = true;
  image.onload = () => {
    if (requestId !== imageRequest) return;
    image.hidden = false;
    fallback.hidden = true;
  };
  image.onerror = () => {
    if (requestId !== imageRequest) return;
    image.hidden = true;
    fallback.hidden = false;
  };
  image.src = camera.image;

  const links = document.querySelectorAll(".camera-links line");
  markers.forEach((marker, markerIndex) => {
    const link = links[markerIndex];
    const selected = markers[currentIndex];
    link.setAttribute("x1", String(parseFloat(selected.style.left || getComputedStyle(selected).left) / selected.parentElement.clientWidth * 100));
    link.setAttribute("y1", String(parseFloat(selected.style.top || getComputedStyle(selected).top) / selected.parentElement.clientHeight * 100));
    link.setAttribute("x2", String(parseFloat(marker.style.left || getComputedStyle(marker).left) / marker.parentElement.clientWidth * 100));
    link.setAttribute("y2", String(parseFloat(marker.style.top || getComputedStyle(marker).top) / marker.parentElement.clientHeight * 100));
    link.style.opacity = markerIndex === currentIndex ? "0" : ".62";
  });
}

function openMaterial(material) {
  document.getElementById("material-category").textContent = material.category;
  document.getElementById("material-title").textContent = material.name;
  document.getElementById("material-description").textContent = material.description;
  document.getElementById("material-maker").textContent = material.maker;
  document.getElementById("material-finish").textContent = material.finish;
  document.getElementById("material-location").textContent = material.location;
  dialog.showModal();
}

markers.forEach((marker, index) => marker.addEventListener("click", () => updateCamera(index)));
document.getElementById("previous-view").addEventListener("click", () => updateCamera(currentIndex - 1, true));
document.getElementById("next-view").addEventListener("click", () => updateCamera(currentIndex + 1, true));
document.addEventListener("keydown", event => {
  if (dialog.open) return;
  if (event.key === "ArrowLeft") updateCamera(currentIndex - 1, true);
  if (event.key === "ArrowRight") updateCamera(currentIndex + 1, true);
});

updateCamera(0);
