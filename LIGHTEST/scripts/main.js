import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

import { FontLoader } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/geometries/TextGeometry.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const ROOM_WIDTH = 15;
const ROOM_DEPTH = 9;
const ROOM_HEIGHT = 4.5;
const WALL_THICKNESS = 0.2;

const HALF_WIDTH = ROOM_WIDTH / 2;
const HALF_DEPTH = ROOM_DEPTH / 2;

const DOOR_WIDTH = 1.8;
const DOOR_HEIGHT = 3.2;
const DOOR_CENTER_X = 6.0;

const BACKGROUND_COLOR = 0x1b1b1f;

const COLORS = {
  floor: 0xc8b89a,
  ceiling: 0xe3d5c3,
  wall: 0xe3d5c3,
  carpet: 0x7a5c8f,
  couch: 0x3b4a6b,
  couchBack: 0x2e3a55,
  beanbag: 0xd9534f,
  consoleTable: 0x6b4a2f,
  tvFrame: 0x111111,
  tvScreen: 0x222a35,
  pot: 0xb5651d,
  plant: 0x2e8b57,
  tableTop: 0x8b5a2b,
  tableLeg: 0x5a3a1c,
  chairSeat: 0x1a1a1a,
  chairAccent: 0xcc2222,
  chairBase: 0x444444,
  bookshelf: 0x5c3d2e,
  door: 0x9c7a54,
  doorFrame: 0x5a3825,
  doorKnob: 0xc0c0c0,
  monitorFrame: 0x111111,
  monitorScreen: 0x252525,
  monitorStand: 0x8a8a8a,
  pcCase: 0x151515,
  pcPanel: 0x252525,
  pcAccent: 0xcc2222,
  keyboard: 0x202020,
  keyboardKeys: 0x444444,
  mousepad: 0x181818,
  mouse: 0x303030,
  mouseAccent: 0xcc2222,
  lampBase: 0x30303a,
  lampShade: 0x24242c,
  lampGlow: 0xffe3b0,
};

const CAMERA_FOV = 75;
const SPRINT_CAMERA_FOV = 82;
const CAMERA_NEAR = 0.1;
const CAMERA_FAR = 1000;

const PLAYER_HEIGHT = 2.15;
const PLAYER_RADIUS = 0.25;
const PLAYER_BODY_HEIGHT = 1.8;
const MOVE_SPEED = 3.0;
const SPRINT_MULTIPLIER = 1.5;
const MOUSE_SENSITIVITY = 0.002;
const MAX_MOUSE_DELTA_PER_FRAME = 100;
const speakerRgbRims = [];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addMesh(parent, geometry, color, x, y, z) {
  const material = new THREE.MeshLambertMaterial({ color: color });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);

  parent.add(mesh);
  return mesh;
}

function addBox(parent, width, height, depth, color, x, y, z) {
  return addMesh(parent, new THREE.BoxGeometry(width, height, depth), color, x, y, z);
}

function usePhongMaterial(mesh, shininess = 100) {
  const material = mesh.material;
  mesh.material = new THREE.MeshPhongMaterial({
    color: material.color,
    map: material.map,
    specular: 0xaaaaaa,
    shininess: shininess
  });
  material.dispose();
}

function useShinyStandardMaterial(mesh) {
  const material = mesh.material;
  mesh.material = new THREE.MeshStandardMaterial({
    color: material.color,
    map: material.map,
    metalness: 0.9,
    roughness: 0.2
  });
  material.dispose();
}

function createRoundedBox(parent, width, height, depth, radius, color, x, y, z) {
  const shape = new THREE.Shape();

  const w = width / 2;
  const h = height / 2;
  const r = Math.min(radius, w, h);

  // Start at bottom-left
  shape.moveTo(-w + r, -h);

  // Bottom
  shape.lineTo(w - r, -h);

  // Bottom-right corner
  shape.quadraticCurveTo(w, -h, w, -h + r);

  // Right side
  shape.lineTo(w, h - r);

  // Top-right corner
  shape.quadraticCurveTo(w, h, w - r, h);

  // Top
  shape.lineTo(-w + r, h);

  // Top-left corner
  shape.quadraticCurveTo(-w, h, -w, h - r);

  // Left side
  shape.lineTo(-w, -h + r);

  // Bottom-left corner
  shape.quadraticCurveTo(-w, -h, -w + r, -h);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: depth,

    // This creates the soft/beveled edges
    bevelEnabled: true,
    bevelThickness: radius,
    bevelSize: radius,
    bevelSegments: 5,

    // Smoothness of the rounded corners
    curveSegments: 8
  });

  geometry.center();

  return addMesh(parent, geometry, color, x, y, z);
}

function createFurnitureGroup(scene, name, x, y, z) {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(x, y, z);
  scene.add(group);
  return group;
}

// ---------------------------------------------------------------------------
// Room structure
// ---------------------------------------------------------------------------
function createFloor(scene) {
  const geometry = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH);
  const floor = addMesh(scene, geometry, COLORS.floor, 0, 0, 0);
  floor.rotation.x = -Math.PI / 2;
  floor.name = "floor";

  new THREE.TextureLoader().load(
    "./textures/wood-floor.png",
    function (texture) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(4, 2);
      texture.colorSpace = THREE.SRGBColorSpace;
      floor.material.map = texture;
      floor.material.color.set(0xffffff);
      floor.material.needsUpdate = true;
    },
    undefined,
    function (error) {
      console.error("Failed to load wood floor texture:", error);
    }
  );
}

function createCeiling(scene) {
  const geometry = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH);
  const ceiling = addMesh(scene, geometry, COLORS.ceiling, 0, ROOM_HEIGHT, 0);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.name = "ceiling";

  new THREE.TextureLoader().load(
    "./textures/wall-texture.png",
    function (texture) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(5, 3);
      texture.colorSpace = THREE.SRGBColorSpace;
      ceiling.material.map = texture;
      ceiling.material.color.set(0xffffff);
      ceiling.material.needsUpdate = true;
    },
    undefined,
    function (error) {
      console.error("Failed to load ceiling texture:", error);
    }
  );
}

function createWalls(scene) {
  const wallY = ROOM_HEIGHT / 2;

  const backWall = addBox(scene, ROOM_WIDTH + WALL_THICKNESS, ROOM_HEIGHT, WALL_THICKNESS,
    COLORS.wall, 0, wallY, -HALF_DEPTH - WALL_THICKNESS / 2);
  backWall.name = "backWall";

  const leftWall = addBox(scene, WALL_THICKNESS, ROOM_HEIGHT, ROOM_DEPTH,
    COLORS.wall, -HALF_WIDTH - WALL_THICKNESS / 2, wallY, 0);
  leftWall.name = "leftWall";

  const rightWall = addBox(scene, WALL_THICKNESS, ROOM_HEIGHT, ROOM_DEPTH,
    COLORS.wall, HALF_WIDTH + WALL_THICKNESS / 2, wallY, 0);
  rightWall.name = "rightWall";

  new THREE.TextureLoader().load(
    "./textures/wall-texture.png",
    function (texture) {
      [
        [backWall, ROOM_WIDTH + WALL_THICKNESS],
        [leftWall, ROOM_DEPTH],
        [rightWall, ROOM_DEPTH]
      ].forEach(function (wall) {
        const wallTexture = texture.clone();
        wallTexture.wrapS = THREE.RepeatWrapping;
        wallTexture.wrapT = THREE.RepeatWrapping;
        wallTexture.repeat.set(wall[1] / 3, ROOM_HEIGHT / 2.25);
        wallTexture.colorSpace = THREE.SRGBColorSpace;
        wallTexture.needsUpdate = true;

        wall[0].material.map = wallTexture;
        wall[0].material.color.set(0xffffff);
        wall[0].material.needsUpdate = true;
      });
    },
    undefined,
    function (error) {
      console.error("Failed to load side and back wall texture:", error);
    }
  );

  createFrontWall(scene, wallY);
}

function createFrontWall(scene, wallY) {
  const frontZ = HALF_DEPTH + WALL_THICKNESS / 2;
  const doorLeftX = DOOR_CENTER_X - DOOR_WIDTH / 2;
  const doorRightX = DOOR_CENTER_X + DOOR_WIDTH / 2;

  const leftSectionWidth = doorLeftX + HALF_WIDTH;
  const leftSection = addBox(scene, leftSectionWidth, ROOM_HEIGHT, WALL_THICKNESS,
    COLORS.wall, -HALF_WIDTH + leftSectionWidth / 2, wallY, frontZ);
  leftSection.name = "frontWallLeft";

  const rightSectionWidth = HALF_WIDTH - doorRightX;
  const rightSection = addBox(scene, rightSectionWidth, ROOM_HEIGHT, WALL_THICKNESS,
    COLORS.wall, doorRightX + rightSectionWidth / 2, wallY, frontZ);
  rightSection.name = "frontWallRight";

  const lintelHeight = ROOM_HEIGHT - DOOR_HEIGHT;
  const lintel = addBox(scene, DOOR_WIDTH, lintelHeight, WALL_THICKNESS,
    COLORS.wall, DOOR_CENTER_X, DOOR_HEIGHT + lintelHeight / 2, frontZ);
  lintel.name = "frontWallLintel";

  new THREE.TextureLoader().load(
    "./textures/brick-wall.png",
    function (texture) {
      [
        [leftSection, leftSectionWidth, ROOM_HEIGHT],
        [rightSection, rightSectionWidth, ROOM_HEIGHT],
        [lintel, DOOR_WIDTH, lintelHeight]
      ].forEach(function (wallPart) {
        const wallTexture = texture.clone();
        wallTexture.wrapS = THREE.RepeatWrapping;
        wallTexture.wrapT = THREE.RepeatWrapping;
        wallTexture.repeat.set(wallPart[1] / 3, wallPart[2] / 2.25);
        wallTexture.colorSpace = THREE.SRGBColorSpace;
        wallTexture.needsUpdate = true;

        wallPart[0].material.map = wallTexture;
        wallPart[0].material.color.set(0xffffff);
        wallPart[0].material.needsUpdate = true;
      });
    },
    undefined,
    function (error) {
      console.error("Failed to load front wall texture:", error);
    }
  );
}

// ---------------------------------------------------------------------------
// Furniture & objects
// ---------------------------------------------------------------------------
function createRoundCarpet(scene) {
  const geometry = new THREE.CircleGeometry(2.2, 48);
  const carpet = addMesh(scene, geometry, COLORS.carpet, 0, 0.02, -1.2);
  carpet.rotation.x = -Math.PI / 2;
  carpet.name = "roundCarpet";

  new THREE.TextureLoader().load(
    "./textures/carpet-texture.png",
    function (texture) {
      texture.colorSpace = THREE.SRGBColorSpace;
      carpet.material.map = texture;
      carpet.material.color.set(0xffffff);
      carpet.material.needsUpdate = true;
    },
    undefined,
    function (error) {
      console.error("Failed to load round carpet texture:", error);
    }
  );
}

function createPoster(
  scene,
  name,
  wall,
  x,
  y,
  z,
  width,
  height,
  imagePath,
  rotation = 0
) {

  const group = createFurnitureGroup(
    scene,
    name,
    x,
    y,
    z
  );

  // ==========================================
  // POSTER FRAME
  // ==========================================

  const frameThickness = 0.06;
  const frameDepth = 0.05;

  let frame;

  // BACK / FRONT WALL
  if (wall === "back" || wall === "front") {

    frame = addBox(
      group,
      width + frameThickness,
      height + frameThickness,
      frameDepth,
      0x181818,
      0,
      0,
      0
    );

  }

  // LEFT / RIGHT WALL
  else {

    frame = addBox(
      group,
      frameDepth,
      height + frameThickness,
      width + frameThickness,
      0x181818,
      0,
      0,
      0
    );

  }

  // ==========================================
  // IMAGE
  // ==========================================

  const textureLoader = new THREE.TextureLoader();

  textureLoader.load(
    imagePath,
    function (texture) {

      const material = new THREE.MeshLambertMaterial({
        map: texture
      });

      const geometry = new THREE.PlaneGeometry(
        width,
        height
      );

      const poster = new THREE.Mesh(
        geometry,
        material
      );

      // ------------------------------------------
      // BACK WALL
      // ------------------------------------------

      if (wall === "back") {

        poster.position.set(
          0,
          0,
          frameDepth / 2 + 0.01
        );

        poster.rotation.y = 0;
      }

      // ------------------------------------------
      // FRONT WALL
      // ------------------------------------------

      if (wall === "front") {

        poster.position.set(
          0,
          0,
          -frameDepth / 2 - 0.01
        );

        poster.rotation.y = Math.PI;
      }

      // ------------------------------------------
      // LEFT WALL
      // ------------------------------------------

      if (wall === "left") {

        poster.position.set(
          frameDepth / 2 + 0.01,
          0,
          0
        );

        poster.rotation.y = Math.PI / 2;
      }

      // ------------------------------------------
      // RIGHT WALL
      // ------------------------------------------

      if (wall === "right") {

        poster.position.set(
          -frameDepth / 2 - 0.01,
          0,
          0
        );

        poster.rotation.y = -Math.PI / 2;
      }

      // ------------------------------------------
      // EXTRA ROTATION
      // ------------------------------------------

      poster.rotation.z = rotation;

      group.add(poster);
    }
  );

  return group;
}


function createConsoleTable(scene) {
  const group = createFurnitureGroup(
    scene,
    "consoleTable",
    0,
    0,
    -4.05
  );

  // ==========================================
  // DIMENSIONS
  // ==========================================

  const width = 5.7;
  const depth = 0.8;
  const bodyHeight = 0.65;

  const legHeight = 0.18;
  const legSize = 0.12;

  // ==========================================
  // MAIN CABINET BODY
  // ==========================================

  const consoleBody = addBox(
    group,
    width,
    bodyHeight,
    depth,
    COLORS.consoleTable,
    0,
    legHeight + bodyHeight / 2,
    0
  );

  new THREE.TextureLoader().load(
    "./textures/console-texture.png",
    function (texture) {
      texture.colorSpace = THREE.SRGBColorSpace;
      consoleBody.material.map = texture;
      consoleBody.material.color.set(0xffffff);
      consoleBody.material.needsUpdate = true;
    },
    undefined,
    function (error) {
      console.error("Failed to load console body texture:", error);
    }
  );

  // ==========================================
  // TOP SURFACE
  // ==========================================

  const consoleTop = addBox(
    group,
    width + 0.08,
    0.10,
    depth + 0.08,
    COLORS.tableTop,
    0,
    legHeight + bodyHeight + 0.05,
    0
  );

  new THREE.TextureLoader().load(
    "./textures/door-texture.png",
    function (texture) {
      texture.colorSpace = THREE.SRGBColorSpace;
      consoleTop.material.map = texture;
      consoleTop.material.color.set(0xffffff);
      consoleTop.material.needsUpdate = true;
    },
    undefined,
    function (error) {
      console.error("Failed to load console tabletop texture:", error);
    }
  );

  const consoleCube = createRoundedBox(
    group,
    0.3,
    0.3,
    0.3,
    0.025,
    COLORS.tableTop,
    -1.85,
    legHeight + bodyHeight + 0.25,
    0
  );
  consoleCube.rotation.y = Math.PI / 4;
  applyTextureToParts(
    [consoleCube],
    "./textures/meat-texture.png",
    "console cube"
  );

  // ==========================================
  // LEFT CABINET DOOR
  // ==========================================

  addBox(
    group,
    1.55,
    0.48,
    0.05,
    COLORS.tableTop,
    -1.85,
    legHeight + 0.33,
    -0.42
  );

  // ==========================================
  // RIGHT CABINET DOOR
  // ==========================================

  addBox(
    group,
    1.55,
    0.48,
    0.05,
    COLORS.tableTop,
    1.85,
    legHeight + 0.33,
    -0.42
  );

  // ==========================================
  // CENTER SHELF
  // ==========================================

  addBox(
    group,
    1.5,
    0.06,
    0.65,
    COLORS.tableTop,
    0,
    legHeight + 0.30,
    0
  );

  // ==========================================
  // CENTER BACK PANEL
  // ==========================================

  addBox(
    group,
    1.5,
    0.48,
    0.05,
    COLORS.consoleTable,
    0,
    legHeight + 0.33,
    0.36
  );

  // ==========================================
  // LEGS
  // ==========================================

  const legX = width / 2 - 0.25;
  const legZ = depth / 2 - 0.18;

  const legs = [
    [-legX, -legZ],
    [ legX, -legZ],
    [-legX,  legZ],
    [ legX,  legZ]
  ];

  const consoleLegParts = [];
  legs.forEach(function (leg) {

    consoleLegParts.push(addBox(
      group,
      legSize,
      legHeight,
      legSize,
      COLORS.tableLeg,
      leg[0],
      legHeight / 2,
      leg[1]
    ));

  });

  applyTextureToParts(
    consoleLegParts,
    "./textures/bookshelf-texture.png",
    "console legs"
  );
}

function createPosters(scene) {

  const posterWidth = 1.25;
  const posterHeight = 1.75;

  // ==========================================
  // BACK WALL
  // One poster on each side of the TV
  // ==========================================

  createPoster(
    scene,
    "backPosterLeft",
    "back",
    -3.25,
    2.8,
    -HALF_DEPTH + WALL_THICKNESS / 2 + 0.03,
    posterWidth,
    posterHeight,
    "./images/poster1.jpg"
  );

  createPoster(
    scene,
    "backPosterRight",
    "back",
    3.25,
    2.8,
    -HALF_DEPTH + WALL_THICKNESS / 2 + 0.03,
    posterWidth,
    posterHeight,
    "./images/poster2.jpg"
  );


  // ==========================================
  // LEFT WALL
  // Messier / diagonal arrangement
  // Away from gaming setup
  // ==========================================

  createPoster(
    scene,
    "leftPoster1",
    "left",
    -HALF_WIDTH + 0.025,
    2.75,
    -3.0,
    posterWidth,
    posterHeight,
    "./images/poster3.jpg"
  );

  createPoster(
    scene,
    "leftPoster2",
    "left",
    -HALF_WIDTH + 0.025,
    2.75,
    -1.35,
    posterWidth,
    posterHeight,
    "./images/poster4.jpg"
  );


  // ==========================================
  // RIGHT WALL
  // Four evenly spaced posters
  // ==========================================

  createPoster(
    scene,
    "rightPoster1",
    "right",
    7.42,
    3.0,
    -3.0,
    posterWidth,
    posterHeight,
    "./images/poster5.jpg"
  );

  createPoster(
    scene,
    "rightPoster2",
    "right",
    7.42,
    3.0,
    -1.0,
    posterWidth,
    posterHeight,
    "./images/poster6.jpg"
  );

  createPoster(
    scene,
    "rightPoster3",
    "right",
    7.42,
    3.0,
    1.0,
    posterWidth,
    posterHeight,
    "./images/poster7.jpg"
  );

  createPoster(
    scene,
    "rightPoster4",
    "right",
    7.42,
    3.0,
    3.0,
    posterWidth,
    posterHeight,
    "./images/poster8.jpg"
  );
}

function createSpeakers(scene) {

  const group = createFurnitureGroup(
    scene,
    "speakers",
    0,
    0,
    -4.05
  );

  // ==========================================
  // SPEAKER DIMENSIONS
  // ==========================================

  const speakerWidth = 0.48;
  const speakerHeight = 0.68;
  const speakerDepth = 0.40;

  const speakerY = 0.7 + speakerHeight / 2 + 0.18;

  const speakerBody = 0x292522;
  const speakerFront = 0x181818;
  const speakerCone = 0x111111;
  const speakerCenter = 0x555555;

  // ==========================================
  // CREATE ONE SPEAKER
  // ==========================================

  function createSpeaker(x) {
    // ------------------------------------------
    // MAIN SPEAKER CABINET
    // ------------------------------------------

    const speakerCabinet = addBox(
      group,
      speakerWidth,
      speakerHeight,
      speakerDepth,
      speakerBody,
      x,
      speakerY,
      0
    );

    // ------------------------------------------
    // FRONT PANEL
    // ------------------------------------------

    const speakerFrontPanel = addBox(
      group,
      speakerWidth - 0.06,
      speakerHeight - 0.06,
      0.035,
      speakerFront,
      x,
      speakerY,
      0.205
    );
    usePhongMaterial(speakerFrontPanel);

    // ------------------------------------------
    // SMALL TWEETER
    // ------------------------------------------

    const tweeter = addMesh(
      group,
      new THREE.CylinderGeometry(
        0.07,
        0.07,
        0.025,
        24
      ),
      speakerCone,
      x,
      speakerY + 0.17,
      0.23
    );

    tweeter.rotation.x = Math.PI / 2;
    useShinyStandardMaterial(tweeter);

    // Tweeter center
    const tweeterCenter = addMesh(
      group,
      new THREE.CylinderGeometry(
        0.025,
        0.025,
        0.03,
        20
      ),
      speakerCenter,
      x,
      speakerY + 0.17,
      0.25
    );

    tweeterCenter.rotation.x = Math.PI / 2;
    useShinyStandardMaterial(tweeterCenter);

    // ------------------------------------------
    // LARGE WOOFER
    // ------------------------------------------

    const woofer = addMesh(
      group,
      new THREE.CylinderGeometry(
        0.14,
        0.14,
        0.025,
        32
      ),
      speakerCone,
      x,
      speakerY - 0.12,
      0.23
    );

    woofer.rotation.x = Math.PI / 2;
    useShinyStandardMaterial(woofer);

    // Woofer center
    const wooferCenter = addMesh(
      group,
      new THREE.CylinderGeometry(
        0.045,
        0.045,
        0.03,
        24
      ),
      speakerCenter,
      x,
      speakerY - 0.12,
      0.25
    );
    wooferCenter.rotation.x = Math.PI / 2;
    useShinyStandardMaterial(wooferCenter);

    const tweeterRim = addMesh(
      group,
      new THREE.TorusGeometry(0.075, 0.003, 8, 48),
      0xff0000,
      x,
      speakerY + 0.17,
      0.253
    );
    tweeterRim.material.emissive.set(0xff0000);
    tweeterRim.material.emissiveIntensity = 1.5;
    speakerRgbRims.push(tweeterRim);

    const wooferRim = addMesh(
      group,
      new THREE.TorusGeometry(0.145, 0.005, 8, 64),
      0xff0000,
      x,
      speakerY - 0.12,
      0.258
    );
    wooferRim.material.emissive.set(0xff0000);
    wooferRim.material.emissiveIntensity = 1.5;
    speakerRgbRims.push(wooferRim);

    useShinyStandardMaterial(speakerCabinet);
  }

  // ==========================================
  // LEFT SPEAKER
  // ==========================================

  createSpeaker(-2.35);

  // ==========================================
  // RIGHT SPEAKER
  // ==========================================

  createSpeaker(2.35);
}

function createWallTv(scene) {

  const group = createFurnitureGroup(
    scene,
    "wallTv",
    0,
    2.3,
    -HALF_DEPTH + 0.06
  );

  // ==========================================
  // TV DIMENSIONS
  // ==========================================

  const tvWidth = 4.6;
  const tvHeight = 2.55;

  // ==========================================
  // TV BACK / BODY
  // ==========================================

  const tvFrame = addBox(
    group,
    tvWidth,
    tvHeight,
    0.14,
    0x0b0b0b,
    0,
    0,
    0
  );
  usePhongMaterial(tvFrame);

  // ==========================================
  // VIDEO
  // ==========================================

  const video = document.createElement("video");

  video.src = "videos/tv-video.mp4";

  video.loop = true;
  video.playsInline = true;
  video.preload = "auto";
  video.muted = false;
  video.volume = 0.01;

  // ==========================================
  // VIDEO TEXTURE
  // ==========================================

  const videoTexture = new THREE.VideoTexture(video);

  videoTexture.colorSpace = THREE.SRGBColorSpace;

  videoTexture.minFilter = THREE.LinearFilter;
  videoTexture.magFilter = THREE.LinearFilter;

  // ==========================================
  // VIDEO SCREEN
  // ==========================================

  const screenGeometry = new THREE.PlaneGeometry(
    tvWidth - 0.18,
    tvHeight - 0.18
  );

  const screenMaterial = new THREE.MeshBasicMaterial({
    map: videoTexture
  });

  const screen = new THREE.Mesh(
    screenGeometry,
    screenMaterial
  );

  screen.position.set(
    0,
    0,
    0.075
  );

  screen.rotation.y = 0;

  group.add(screen);

  // ==========================================
  // BOTTOM BEZEL
  // ==========================================

  const tvBezel = addBox(
    group,
    tvWidth - 0.15,
    0.08,
    0.045,
    0x151515,
    0,
    -(tvHeight / 2) + 0.08,
    0.10
  );
  usePhongMaterial(tvBezel);

  // ==========================================
  // SMALL STATUS LIGHT
  // ==========================================

  addMesh(
    group,
    new THREE.SphereGeometry(
      0.025,
      12,
      8
    ),
    0x00ffff,
    tvWidth / 2 - 0.18,
    -(tvHeight / 2) + 0.12,
    0.12
  );

  const statusGlow = new THREE.PointLight(0x00ffff, 0.15, 0.7, 2);
  statusGlow.position.set(
    tvWidth / 2 - 0.18,
    -(tvHeight / 2) + 0.12,
    0.14
  );
  group.add(statusGlow);

  // ==========================================
  // WALL MOUNT / SUPPORT
  // ==========================================

  addBox(
    group,
    1.2,
    0.18,
    0.12,
    0x222222,
    0,
    -(tvHeight / 2) - 0.08,
    0
  );

  // ==========================================
  // START VIDEO AFTER USER INTERACTION
  // ==========================================

  function startVideo() {

    video.play().catch(function (error) {
      console.log("Video could not start:", error);
    });

    document.removeEventListener("click", startVideo);
    document.removeEventListener("keydown", startVideo);
  }

  document.addEventListener("click", startVideo);
  document.addEventListener("keydown", startVideo);

  // ==========================================
  // TV GLOW LIGHT
  // ==========================================

  const tvLight = new THREE.PointLight(0x88ccff, 4, 7);
  tvLight.position.set(0, 0.2, 1.0);
  group.add(tvLight);

  return group;
}

function createPottedPlant(scene, name, x, z) {
  const group = createFurnitureGroup(scene, name, x, 0, z);

  // ==========================================
  // POT
  // ==========================================

  const potHeight = 0.55;

  const potBody = addMesh(
    group,
    new THREE.CylinderGeometry(
      0.38,
      0.30,
      potHeight,
      24
    ),
    COLORS.pot,
    0,
    potHeight / 2,
    0
  );

  // ==========================================
  // POT RIM
  // ==========================================

  const potRim = addMesh(
    group,
    new THREE.CylinderGeometry(
      0.42,
      0.42,
      0.10,
      24
    ),
    COLORS.pot,
    0,
    potHeight + 0.05,
    0
  );

  new THREE.TextureLoader().load(
    "./textures/pot-texture.png",
    function (texture) {
      [potBody, potRim].forEach(function (part) {
        const partTexture = texture.clone();
        partTexture.wrapS = THREE.RepeatWrapping;
        partTexture.wrapT = THREE.RepeatWrapping;
        partTexture.repeat.set(1, 1);
        partTexture.colorSpace = THREE.SRGBColorSpace;
        partTexture.needsUpdate = true;

        part.material.map = partTexture;
        part.material.color.set(0xffffff);
        part.material.needsUpdate = true;
      });
    },
    undefined,
    function (error) {
      console.error("Failed to load plant pot texture:", error);
    }
  );

  // ==========================================
  // SOIL
  // ==========================================

  const soil = addMesh(
    group,
    new THREE.CylinderGeometry(
      0.34,
      0.34,
      0.04,
      24
    ),
    0x3b2415,
    0,
    potHeight + 0.11,
    0
  );

  new THREE.TextureLoader().load(
    "./textures/soil-texture.png",
    function (texture) {
      texture.colorSpace = THREE.SRGBColorSpace;
      soil.material.map = texture;
      soil.material.color.set(0xffffff);
      soil.material.needsUpdate = true;
    },
    undefined,
    function (error) {
      console.error("Failed to load soil texture:", error);
    }
  );

  // ==========================================
  // MAIN STEM
  // ==========================================

  addMesh(
    group,
    new THREE.CylinderGeometry(
      0.045,
      0.06,
      0.75,
      10
    ),
    0x356b35,
    0,
    potHeight + 0.48,
    0
  );

  // ==========================================
  // LEAVES
  // ==========================================

  const leaves = [
    [-0.25, 0.82, 0.05, -0.55, 0.00, 0.25],
    [ 0.25, 0.88, 0.05,  0.55, 0.00, -0.25],
    [-0.18, 1.05, 0.10, -0.35, 0.00, 0.35],
    [ 0.18, 1.12, 0.05,  0.40, 0.00, -0.35],
    [ 0.00, 1.28, 0.00,  0.00, 0.00, 0.00],
    [-0.30, 1.25, 0.05, -0.65, 0.00, 0.15],
    [ 0.30, 1.30, 0.05,  0.65, 0.00, -0.15]
  ];

  const leafMeshes = [];
  leaves.forEach(function (leaf) {

    const leafMesh = addMesh(
      group,
      new THREE.SphereGeometry(
        0.20,
        12,
        8
      ),
      COLORS.plant,
      leaf[0],
      leaf[1],
      leaf[2]
    );

    leafMesh.scale.set(
      0.55,
      1.0,
      1.6
    );

    leafMesh.rotation.y = leaf[3];
    leafMesh.rotation.x = leaf[4];
    leafMesh.rotation.z = leaf[5];
    leafMeshes.push(leafMesh);

  });

  new THREE.TextureLoader().load(
    "./textures/leaves-texture.png",
    function (texture) {
      leafMeshes.forEach(function (leafMesh) {
        const leafTexture = texture.clone();
        leafTexture.colorSpace = THREE.SRGBColorSpace;
        leafTexture.needsUpdate = true;
        leafMesh.material.map = leafTexture;
        leafMesh.material.color.set(0xffffff);
        leafMesh.material.needsUpdate = true;
      });
    },
    undefined,
    function (error) {
      console.error("Failed to load plant leaves texture:", error);
    }
  );
}

function createLCouch(scene) {
  const group = createFurnitureGroup(scene, "couch", 0, 0, 0);
  const couchParts = [];

  // Couch dimensions
  const couchWidth = 4.8;
  const couchDepth = 1.75;

  const seatHeight = 0.45;
  const seatDepth = 1.55;

  const backHeight = 0.85;
  const backThickness = 0.38;

  const armWidth = 0.32;
  const armHeight = 0.62;

  const cushionRadius = 0.12;
  const backRadius = 0.12;
  const armRadius = 0.12;


  // ==========================================
  // SEAT CUSHION
  // ==========================================

  couchParts.push(createRoundedBox(
    group,
    couchWidth - 0.4,
    seatHeight,
    seatDepth,
    cushionRadius,
    COLORS.couch,
    0,
    seatHeight / 2,
    1.18
  ));


  // ==========================================
  // BACKREST
  // ==========================================

  couchParts.push(createRoundedBox(
    group,
    couchWidth,
    backHeight,
    backThickness,
    backRadius,
    COLORS.couchBack,
    0,
    seatHeight + backHeight / 2,
    1.18 + couchDepth / 2 - backThickness / 2
  ));


  // ==========================================
  // LEFT ARMREST
  // ==========================================

  couchParts.push(createRoundedBox(
    group,
    armWidth,
    armHeight,
    couchDepth,
    armRadius,
    COLORS.couch,
    -(couchWidth / 2) + armWidth / 2,
    seatHeight + armHeight / 2 - 0.05,
    1.18
  ));


  // ==========================================
  // RIGHT ARMREST
  // ==========================================

  couchParts.push(createRoundedBox(
    group,
    armWidth,
    armHeight,
    couchDepth,
    armRadius,
    COLORS.couch,
    (couchWidth / 2) - armWidth / 2,
    seatHeight + armHeight / 2 - 0.05,
    1.18
  ));


  // ==========================================
  // FRONT LOWER BASE
  // ==========================================

  couchParts.push(createRoundedBox(
    group,
    couchWidth - 0.2,
    0.35,
    1.5,
    0.10,
    COLORS.couch,
    0,
    0.18,
    1.18
  ));

  new THREE.TextureLoader().load(
    "./textures/couch-texture.png",
    function (texture) {
      couchParts.forEach(function (part) {
        const partTexture = texture.clone();
        partTexture.wrapS = THREE.RepeatWrapping;
        partTexture.wrapT = THREE.RepeatWrapping;
        partTexture.repeat.set(2, 1);
        partTexture.colorSpace = THREE.SRGBColorSpace;
        partTexture.needsUpdate = true;

        part.material.map = partTexture;
        part.material.color.set(0xffffff);
        part.material.needsUpdate = true;
      });
    },
    undefined,
    function (error) {
      console.error("Failed to load couch texture:", error);
    }
  );
}

function createCouchPillows(scene) {

  const group = createFurnitureGroup(
    scene,
    "couchPillows",
    0,
    0,
    0
  );

  // ==========================================
  // PILLOW DIMENSIONS
  // ==========================================

  const pillowSize = 0.82;
  const pillowHeight = 0.4;
  const pillowDepth = 0.1;
  const pillowRadius = 0.07;
  const pillows = [];

  function createPillow(x, rotationY, rotationZ) {

    const pillow = createRoundedBox(
      group,
      pillowSize,
      pillowHeight,
      pillowDepth,
      pillowRadius,
      0x596b91,
      x,
      0.85,
      1.3
    );

    pillow.rotation.x = 0.25;
    pillow.rotation.y = rotationY;
    pillow.rotation.z = rotationZ;
    pillows.push(pillow);

    return pillow;
  }

  // ==========================================
  // LEFT PILLOW
  // ==========================================

  createPillow(
    -1.5,
    -0.4,
    0.04
  );

  // ==========================================
  // RIGHT PILLOW
  // ==========================================

  createPillow(
    1.5,
    0.4,
    -0.05
  );

  applyTextureToParts(
    pillows,
    "./textures/plaid-texture.png",
    "couch pillows"
  );

  return group;
}

function createBeanbag(scene) {
  const group = createFurnitureGroup(scene, "ottoman", -3.7, 0, -0.95);

  // Main round ottoman
  const ottomanBody = addMesh(
    group,
    new THREE.CylinderGeometry(
      0.75,  // top radius
      0.75,  // bottom radius
      0.55,  // height
      32,    // radial segments
      4      // height segments
    ),
    COLORS.beanbag,
    0,
    0.4,
    0
  );

  // Soft rounded top
  const ottomanTop = addMesh(
    group,
    new THREE.CylinderGeometry(
      0.68,
      0.75,
      0.18,
      32,
      4
    ),
    COLORS.beanbag,
    0,
    0.72,
    0
  );

  new THREE.TextureLoader().load(
    "./textures/ottoman-texture.png",
    function (texture) {
      [ottomanBody, ottomanTop].forEach(function (part) {
        const partTexture = texture.clone();
        partTexture.wrapS = THREE.RepeatWrapping;
        partTexture.wrapT = THREE.RepeatWrapping;
        partTexture.repeat.set(2, 1);
        partTexture.colorSpace = THREE.SRGBColorSpace;
        partTexture.needsUpdate = true;

        part.material.map = partTexture;
        part.material.color.set(0xffffff);
        part.material.needsUpdate = true;
      });
    },
    undefined,
    function (error) {
      console.error("Failed to load ottoman texture:", error);
    }
  );
}

function createTable(scene) {
  const group = createFurnitureGroup(
    scene,
    "table",
    -6.4,
    0,
    2.3
  );

  // ==========================================
  // TABLE DIMENSIONS
  // ==========================================

  const tableHeight = 1.0;
  const topThickness = 0.10;

  const topWidth = 2.0;
  const topDepth = 4.2;

  const legSize = 0.12;
  const legHeight = tableHeight - topThickness;
  const deskLegParts = [];


  // ==========================================
  // TABLE TOP
  // ==========================================

  const deskTop = addBox(
    group,
    topWidth,
    topThickness,
    topDepth,
    COLORS.tableTop,
    0,
    tableHeight - topThickness / 2,
    0
  );

  new THREE.TextureLoader().load(
    "./textures/door-texture.png",
    function (texture) {
      texture.colorSpace = THREE.SRGBColorSpace;
      deskTop.material.map = texture;
      deskTop.material.color.set(0xffffff);
      deskTop.material.needsUpdate = true;
    },
    undefined,
    function (error) {
      console.error("Failed to load desk tabletop texture:", error);
    }
  );


  // ==========================================
  // TABLE LEGS
  // ==========================================

  const legOffsetX = topWidth / 2 - legSize;
  const legOffsetZ = topDepth / 2 - legSize;

  const legPositions = [
    [-legOffsetX, -legOffsetZ],
    [legOffsetX, -legOffsetZ],
    [-legOffsetX, legOffsetZ],
    [legOffsetX, legOffsetZ],
  ];

  legPositions.forEach(function (position) {
    deskLegParts.push(addBox(
      group,
      legSize,
      legHeight,
      legSize,
      COLORS.tableLeg,
      position[0],
      legHeight / 2,
      position[1]
    ));
  });

  applyTextureToParts(
    deskLegParts,
    "./textures/bookshelf-texture.png",
    "desk legs"
  );
}

function applyTextureToParts(parts, texturePath, description) {
  new THREE.TextureLoader().load(
    texturePath,
    function (texture) {
      parts.forEach(function (part) {
        const partTexture = texture.clone();
        partTexture.wrapS = THREE.RepeatWrapping;
        partTexture.wrapT = THREE.RepeatWrapping;
        partTexture.repeat.set(1, 1);
        partTexture.colorSpace = THREE.SRGBColorSpace;
        partTexture.needsUpdate = true;

        part.material.map = partTexture;
        part.material.color.set(0xffffff);
        part.material.needsUpdate = true;
      });
    },
    undefined,
    function (error) {
      console.error("Failed to load texture for " + description + ":", error);
    }
  );
}

function createGamingSetup(scene) {
  const setupZOffset = -0.3;
  const group = createFurnitureGroup(
    scene,
    "gamingSetup",
    -6.4,
    0,
    2.3 + setupZOffset
  );

  // ==========================================
  // DESK HEIGHT
  // ==========================================

  const deskTopY = 0.95;
  const setupXOffset = 0.2;

  // ==========================================
  // MONITOR DIMENSIONS
  // ==========================================

  const monitorWidth = 1.05;
  const monitorHeight = 0.68;
  const monitorThickness = 0.07;

  const monitorY = deskTopY + 0.62;

  // All monitors sit toward the chair side
  const monitorX = -0.6 + setupXOffset;

  // Spread them along the long side of the desk
  const monitorPositions = [-1.15, 0, 1.15];

  monitorPositions.forEach(function (z, index) {

    // ==========================================
    // INDIVIDUAL MONITOR GROUP
    // ==========================================

    const monitorGroup = new THREE.Group();
    group.add(monitorGroup);

    // ==========================================
    // MONITOR FRAME
    // ==========================================

    const monitorFrame = addBox(
      monitorGroup,
      monitorThickness,
      monitorHeight,
      monitorWidth,
      COLORS.monitorFrame,
      0,
      0,
      0
    );
    usePhongMaterial(monitorFrame);

    // ==========================================
    // SCREEN
    // ==========================================

    if (index === 0 || index === 2) {

      const textureLoader = new THREE.TextureLoader();

      const imagePath =
        index === 0
          ? "./images/discord.png"
          : "./images/spotify.png";

      textureLoader.load(
        imagePath,
        function (texture) {

          const screenGeometry = new THREE.PlaneGeometry(
            monitorWidth - 0.08,
            monitorHeight - 0.08
          );

          // Keep monitor displays self-lit like real screens.
          const screenMaterial = new THREE.MeshBasicMaterial({
            map: texture
          });

          const screen = new THREE.Mesh(
            screenGeometry,
            screenMaterial
          );

          screen.position.set(
            0.041,
            0,
            0
          );

          screen.rotation.y = Math.PI / 2;

          monitorGroup.add(screen);
        }
      );

    } else {

    // ==========================================
    // CENTER MONITOR = VIDEO
    // ==========================================

    const video = document.createElement("video");

    video.src = "videos/monitor-video.mp4";
    video.loop = true;
    video.playsInline = true;
    video.preload = "auto";
    video.muted = true;

    const videoTexture = new THREE.VideoTexture(video);

    videoTexture.colorSpace = THREE.SRGBColorSpace;
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;

    const screenGeometry = new THREE.PlaneGeometry(
      monitorWidth - 0.08,
      monitorHeight - 0.08
    );

    // Keep the video display self-lit like a real screen.
    const screenMaterial = new THREE.MeshBasicMaterial({
      map: videoTexture
    });

    const screen = new THREE.Mesh(
      screenGeometry,
      screenMaterial
    );

    screen.position.set(
      0.041,
      0,
      0
    );

    screen.rotation.y = Math.PI / 2;

    monitorGroup.add(screen);

    // Start the video
    video.play().catch(function () {
      console.log("Monitor video will start after user interaction.");
    });

    }

    // ==========================================
    // MONITOR STAND
    // ==========================================

    const monitorStand = addBox(
      monitorGroup,
      0.08,
      0.42,
      0.08,
      COLORS.monitorStand,
      0,
      -0.39,
      0
    );
    useShinyStandardMaterial(monitorStand);

    // ==========================================
    // MONITOR BASE
    // ==========================================

    const monitorBase = addBox(
      monitorGroup,
      0.28,
      0.05,
      0.42,
      COLORS.monitorStand,
      0,
      -0.59,
      0
    );
    useShinyStandardMaterial(monitorBase);

    // ==========================================
    // POSITION MONITOR
    // ==========================================

    const forwardOffset = index === 1 ? 0 : 0.12;
    const backOffset = -0.12;

    monitorGroup.position.set(
      monitorX + setupXOffset + forwardOffset + backOffset,
      monitorY,
      z
    );

    // ==========================================
    // ANGLE SIDE MONITORS INWARD
    // ==========================================

    if (index === 0) {

      // Left monitor angles toward the center
      monitorGroup.rotation.y = -0.18;

    } else if (index === 2) {

      // Right monitor angles toward the center
      monitorGroup.rotation.y = 0.18;

    }

    const monitorLight = new THREE.SpotLight(
      0x88ccff,
      5,
      5,
      0.65,
      0.6,
      1
    );
    monitorLight.position.set(0.08, 0, 0);
    monitorLight.target.position.set(2, 0, 0);
    monitorGroup.add(monitorLight);
    monitorGroup.add(monitorLight.target);

  });

  // ==========================================
  // PC TOWER
  // ==========================================

  const pcGroup = new THREE.Group();
  group.add(pcGroup);

  const pcWidth = 0.48;
  const pcHeight = 0.85;
  const pcDepth = 0.80;
  const pcCaseParts = [];

  // ------------------------------------------
  // PC CASE
  // ------------------------------------------

  pcCaseParts.push(addBox(
    pcGroup,
    pcWidth,
    pcHeight,
    pcDepth,
    COLORS.pcCase,
    0,
    pcHeight / 2,
    0
  ));

  // ------------------------------------------
  // SIDE PANEL
  // ------------------------------------------

  const pcSidePanel = addBox(
    pcGroup,
    0.02,
    0.65,
    0.62,
    COLORS.pcPanel,
    pcWidth / 2 + 0.01,
    pcHeight / 2,
    0
  );
  pcCaseParts.push(pcSidePanel);
  usePhongMaterial(pcSidePanel);

  // ------------------------------------------
  // RED ACCENT STRIP
  // ------------------------------------------

  const pcRgbAccent = addBox(
    pcGroup,
    0.02,
    0.58,
    0.05,
    COLORS.pcAccent,
    pcWidth / 2 + 0.025,
    pcHeight / 2,
    -0.25
  );
  pcRgbAccent.name = "pcRgbAccent";
  pcRgbAccent.material.emissive.set(0xff0000);
  pcRgbAccent.material.emissiveIntensity = 0.25;

  const pcRgbLight = new THREE.PointLight(0xff0000, 0.2, 1.2);
  pcRgbLight.name = "pcRgbAccentLight";
  pcRgbLight.position.set(
    pcWidth / 2 + 0.1,
    pcHeight / 2,
    -0.25
  );
  pcGroup.add(pcRgbLight);

  // ------------------------------------------
  // POWER BUTTON
  // ------------------------------------------

  addMesh(
    pcGroup,
    new THREE.CylinderGeometry(
      0.04,
      0.04,
      0.02,
      16
    ),
    COLORS.pcAccent,
    0,
    pcHeight - 0.10,
    0.25
  );

  applyTextureToParts(
    pcCaseParts,
    "./textures/pc-texture.png",
    "dark PC case surfaces"
  );

  // ==========================================
  // PC POSITION
  // ==========================================

  pcGroup.position.set(
    0.55,
    deskTopY,
    1.85
  );

  // Rotate PC so its depth runs along the desk
  pcGroup.rotation.y = Math.PI / 2;

  // ==========================================
  // MOUSEPAD
  // ==========================================

  addBox(
    group,
    0.06,
    0.025,
    0.75,
    COLORS.mousepad,
    0.25,
    deskTopY + 0.012,
    0.85
  );


  // ==========================================
  // KEYBOARD
  // ==========================================

  const keyboardX = 0.35 + setupXOffset;
  const keyboardZ = 0.25;

  const keyboardWidth = 0.48;
  const keyboardDepth = 1.35;

  const keyboardBase = addBox(
    group,
    keyboardWidth,
    0.07,
    keyboardDepth,
    COLORS.keyboard,
    keyboardX,
    deskTopY + 0.05,
    keyboardZ
  );
  useShinyStandardMaterial(keyboardBase);


  // ==========================================
  // KEYBOARD KEYS
  // ==========================================

  const keyRows = 4;
  const keysPerRow = 10;

  const keyWidth = 0.035;
  const keyHeight = 0.025;
  const keyDepth = 0.085;

  const keyStartZ = keyboardZ - 0.48;
  const keyStartX = keyboardX - 0.12;

  for (let row = 0; row < keyRows; row++) {

    for (let key = 0; key < keysPerRow; key++) {

      addBox(
        group,
        keyWidth,
        keyHeight,
        keyDepth,
        COLORS.keyboardKeys,
        keyStartX + row * 0.08,
        deskTopY + 0.10,
        keyStartZ + key * 0.095
      );

    }
  }


  // ==========================================
  // SPACE BAR
  // ==========================================

  addBox(
    group,
    0.04,
    0.025,
    0.55,
    COLORS.keyboardKeys,
    keyboardX + 0.12,
    deskTopY + 0.10,
    keyboardZ + 0.10
  );


  // ==========================================
  // MOUSEPAD
  // ==========================================

  addBox(
    group,
    0.45,
    0.025,
    0.70,
    COLORS.mousepad,
    keyboardX,
    deskTopY + 0.012,
    -0.78
  );


  // ==========================================
  // MOUSE
  // ==========================================

  const mouse = addBox(
    group,
    0.16,
    0.07,
    0.28,
    COLORS.mouse,
    keyboardX,
    deskTopY + 0.08,
    -0.78
  );

  // Rotate mouse 90 degrees
  mouse.rotation.y = Math.PI / 2;


  // ==========================================
  // MOUSE CENTER BUTTON
  // ==========================================

  const mouseButton = addBox(
    group,
    0.035,
    0.015,
    0.08,
    COLORS.mouseAccent,
    keyboardX,
    deskTopY + 0.125,
    -0.78
  );

  mouseButton.rotation.y = Math.PI / 2;
}

function createGamingChair(scene) {
  const group = createFurnitureGroup(
    scene,
    "gamingChair",
    -4.7,
    0,
    2.74
  );
  const chairUpholstery = [];

  addMesh(
    group,
    new THREE.CylinderGeometry(0.08, 0.08, 0.45, 12),
    COLORS.chairBase,
    0,
    0.225,
    0
  );

  // ==========================================
  // FIVE-STAR BASE
  // ==========================================

  addMesh(
    group,
    new THREE.CylinderGeometry(0.48, 0.48, 0.06, 5),
    COLORS.chairBase,
    0,
    0.03,
    0
  );

  // ==========================================
  // SEAT
  // ==========================================

  chairUpholstery.push(addBox(
    group,
    1.0,
    0.14,
    1.0,
    COLORS.chairSeat,
    0,
    0.53,
    0
  ));

  // ==========================================
  // BACKREST
  // ==========================================

  chairUpholstery.push(addBox(
    group,
    1.0,
    1.15,
    0.12,
    COLORS.chairSeat,
    0,
    1.08,
    0.43
  ));

  // ==========================================
  // HEADREST
  // ==========================================

  const chairRedAccent = addBox(
    group,
    0.62,
    0.30,
    0.14,
    COLORS.chairAccent,
    0,
    1.65,
    0.43
  );
  group.rotation.y = Math.PI / 4;

  applyTextureToParts(
    [chairRedAccent],
    "./textures/ottoman-texture.png",
    "gaming chair red accent"
  );

  new THREE.TextureLoader().load(
    "./textures/leather-texture.png",
    function (texture) {
      chairUpholstery.forEach(function (part) {
        const partTexture = texture.clone();
        partTexture.wrapS = THREE.RepeatWrapping;
        partTexture.wrapT = THREE.RepeatWrapping;
        partTexture.repeat.set(2, 2);
        partTexture.colorSpace = THREE.SRGBColorSpace;
        partTexture.needsUpdate = true;

        part.material.map = partTexture;
        part.material.color.set(0xffffff);
        part.material.needsUpdate = true;
      });
    },
    undefined,
    function (error) {
      console.error("Failed to load gaming chair leather texture:", error);
    }
  );
}

function createBookshelf(scene) {
  const group = createFurnitureGroup(
    scene,
    "bookshelf",
    HALF_WIDTH - 0.28,
    0,
    -2
  );
  const bookshelfParts = [];

  const shelfHeight = 2.2;

  const shelfWidth = 3.9;
  const shelfDepth = 0.52;
  const shelfThickness = 0.12;
  const sideWidth = 0.18;

  // Rotate the bookshelf so it sits against the right wall
  group.rotation.y = Math.PI / 2;


  // ==========================================
  // LEFT SIDE PANEL
  // ==========================================

  bookshelfParts.push(addBox(
    group,
    sideWidth,
    shelfHeight,
    shelfDepth,
    COLORS.bookshelf,
    -(shelfWidth / 2) + sideWidth / 2,
    shelfHeight / 2,
    0
  ));


  // ==========================================
  // RIGHT SIDE PANEL
  // ==========================================

  bookshelfParts.push(addBox(
    group,
    sideWidth,
    shelfHeight,
    shelfDepth,
    COLORS.bookshelf,
    (shelfWidth / 2) - sideWidth / 2,
    shelfHeight / 2,
    0
  ));


  // ==========================================
  // SHELVES
  // ==========================================

  const shelfPositions = [
    0.05,
    0.55,
    1.05,
    1.55,
    2.05
  ];

  shelfPositions.forEach((y) => {
    bookshelfParts.push(addBox(
      group,
      shelfWidth,
      shelfThickness,
      shelfDepth,
      COLORS.bookshelf,
      0,
      y,
      0
    ));
  });

  new THREE.TextureLoader().load(
    "./textures/bookshelf-texture.png",
    function (texture) {
      bookshelfParts.forEach(function (part) {
        const partTexture = texture.clone();
        partTexture.wrapS = THREE.RepeatWrapping;
        partTexture.wrapT = THREE.RepeatWrapping;
        partTexture.repeat.set(2, 1);
        partTexture.colorSpace = THREE.SRGBColorSpace;
        partTexture.needsUpdate = true;

        part.material.map = partTexture;
        part.material.color.set(0xffffff);
        part.material.needsUpdate = true;
      });
    },
    undefined,
    function (error) {
      console.error("Failed to load bookshelf texture:", error);
    }
  );

  // ==========================================
  // BOOKS
  // ==========================================

  createBooksOnShelf(group, 0.05, 6, shelfThickness);
  createBooksOnShelf(group, 0.55, 8, shelfThickness);
  createBooksOnShelf(group, 1.05, 5, shelfThickness);
  createBooksOnShelf(group, 1.55, 7, shelfThickness);
  createBooksOnShelf(group, 2.05, 4, shelfThickness);
}

function createBooksOnShelf(group, shelfY, bookCount, shelfThickness) {

  const bookColors = [
    0x8b4513,
    0x556b2f,
    0x4b6584,
    0x8b3a3a,
    0x6b4f3a,
    0x7a5c61
  ];

  let x = -1.7;

  // ==========================================
  // TOP OF THE SHELF
  // ==========================================

  const shelfTop = shelfY + shelfThickness / 2;

  // Tiny gap between shelf and book
  const bookBottom = shelfTop;


  // ==========================================
  // CREATE BOOKS
  // ==========================================

  for (let i = 0; i < bookCount; i++) {

    const bookWidth = 0.13 + Math.random() * 0.08;
    const bookHeight = 0.24 + Math.random() * 0.15;
    const bookDepth = 0.2 + Math.random() * 0.04;
    const color = bookColors[i % bookColors.length];
    const bookZ = Math.random() < 0.5 ? -0.13 : 0.13;


    // ==========================================
    // HORIZONTAL BOOK STACK
    // ==========================================

    if (i === 3 || (i === 6 && Math.random() > 0.4)) {

      const stackHeight = 0.045 + Math.random() * 0.025;
      const stackWidth = 0.34 + Math.random() * 0.12;
      const stackX = x + stackWidth / 2;
      const stackZ = bookZ;

      // Bottom book
      addBox(
        group,
        stackWidth,
        stackHeight,
        bookDepth,
        color,
        stackX,
        bookBottom + stackHeight / 2,
        stackZ
      );

      // Top book
      addBox(
        group,
        stackWidth * (0.85 + Math.random() * 0.1),
        stackHeight,
        bookDepth,
        bookColors[(i + 1) % bookColors.length],
        stackX + (Math.random() - 0.5) * 0.04,
        bookBottom + stackHeight + stackHeight / 2,
        stackZ + (Math.random() - 0.5) * 0.04
      );

      x += stackWidth + 0.08;


    } else {

      // ==========================================
      // STANDING BOOK
      // ==========================================

      const lean = Math.random() < 0.3
        ? (Math.random() < 0.5 ? -1 : 1) * (0.12 + Math.random() * 0.18)
        : (Math.random() - 0.5) * 0.04;
      const book = addBox(
        group,
        bookWidth,
        bookHeight,
        bookDepth,
        color,
        x,
        bookBottom + bookHeight / 2 + bookWidth * Math.sin(Math.abs(lean)) / 2,
        bookZ
      );
      book.rotation.z = lean;

      x += bookWidth + 0.025 + Math.random() * 0.045;
    }
  }
}


function createDoor(scene) {
  // ==========================================
  // DOOR DIMENSIONS
  // ==========================================

  const doorThickness = 0.12;
  const frameThickness = 0.12;
  const frameDepth = 0.18;

  // Door sits closed against the front wall
  const doorX = DOOR_CENTER_X;
  const doorZ = HALF_DEPTH - doorThickness / 2;
  const doorFrameParts = [];


  // ==========================================
  // DOOR
  // ==========================================

  const door = addBox(
    scene,
    DOOR_WIDTH,
    DOOR_HEIGHT,
    doorThickness,
    COLORS.door,
    doorX,
    DOOR_HEIGHT / 2,
    doorZ
  );

  new THREE.TextureLoader().load(
    "./textures/door-texture.png",
    function (texture) {
      texture.colorSpace = THREE.SRGBColorSpace;
      door.material.map = texture;
      door.material.color.set(0xffffff);
      door.material.needsUpdate = true;
    },
    undefined,
    function (error) {
      console.error("Failed to load door texture:", error);
    }
  );


  // ==========================================
  // DOOR FRAME - LEFT
  // ==========================================

  doorFrameParts.push(addBox(
    scene,
    frameThickness,
    DOOR_HEIGHT + frameThickness,
    frameDepth,
    COLORS.doorFrame,
    doorX - DOOR_WIDTH / 2 - frameThickness / 2,
    (DOOR_HEIGHT + frameThickness) / 2,
    HALF_DEPTH - frameDepth / 2
  ));


  // ==========================================
  // DOOR FRAME - RIGHT
  // ==========================================

  doorFrameParts.push(addBox(
    scene,
    frameThickness,
    DOOR_HEIGHT + frameThickness,
    frameDepth,
    COLORS.doorFrame,
    doorX + DOOR_WIDTH / 2 + frameThickness / 2,
    (DOOR_HEIGHT + frameThickness) / 2,
    HALF_DEPTH - frameDepth / 2
  ));


  // ==========================================
  // DOOR FRAME - TOP
  // ==========================================

  doorFrameParts.push(addBox(
    scene,
    DOOR_WIDTH + frameThickness * 2,
    frameThickness,
    frameDepth,
    COLORS.doorFrame,
    doorX,
    DOOR_HEIGHT + frameThickness / 2,
    HALF_DEPTH - frameDepth / 2
  ));

  new THREE.TextureLoader().load(
    "./textures/bookshelf-texture.png",
    function (texture) {
      doorFrameParts.forEach(function (part) {
        const frameTexture = texture.clone();
        frameTexture.wrapS = THREE.RepeatWrapping;
        frameTexture.wrapT = THREE.RepeatWrapping;
        frameTexture.repeat.set(1, 1);
        frameTexture.colorSpace = THREE.SRGBColorSpace;
        frameTexture.needsUpdate = true;

        part.material.map = frameTexture;
        part.material.color.set(0xffffff);
        part.material.needsUpdate = true;
      });
    },
    undefined,
    function (error) {
      console.error("Failed to load door frame texture:", error);
    }
  );

  // ==========================================
  // DOORKNOB
  // ==========================================

  const knobX = doorX + DOOR_WIDTH / 2 - 0.22;
  const knobY = DOOR_HEIGHT * 0.48;
  const knobZ = HALF_DEPTH - doorThickness - 0.08;

  const knobPlate = addMesh(
    scene,
    new THREE.CylinderGeometry(0.15, 0.15, 0.035, 32),
    COLORS.doorKnob,
    knobX,
    knobY,
    knobZ
  );
  knobPlate.rotation.x = Math.PI / 2;
  usePhongMaterial(knobPlate);

  const knobNeck = addMesh(
    scene,
    new THREE.CylinderGeometry(0.065, 0.075, 0.12, 20),
    COLORS.doorKnob,
    knobX,
    knobY,
    knobZ - 0.07
  );
  knobNeck.rotation.x = Math.PI / 2;
  usePhongMaterial(knobNeck);

  const doorknob = addMesh(
    scene,
    new THREE.SphereGeometry(0.105, 24, 16),
    COLORS.doorKnob,
    knobX,
    knobY,
    knobZ - 0.14
  );
  usePhongMaterial(doorknob);
}

function createFloorLamp(
  scene,
  name = "gamingFloorLamp",
  x = HALF_WIDTH - 0.55,
  z = 0.65,
  scale = 1,
  rotationY = Math.PI / 2,
  lightIntensity = 2
) {

  const group = createFurnitureGroup(
    scene,
    name,
    x,
    0,
    z
  );

  group.scale.setScalar(scale);
  group.rotation.y = rotationY;

  // ==========================================
  // LAMP DIMENSIONS
  // ==========================================

  const lampHeight = 2.8;

  // ==========================================
  // BASE
  // ==========================================

  addMesh(
    group,
    new THREE.CylinderGeometry(
      0.38,
      0.44,
      0.12,
      32
    ),
    COLORS.lampBase,
    0,
    0.06,
    0
  );

  // ==========================================
  // VERTICAL LIGHT BODY
  // ==========================================

  const bodyWidth = 0.28;
  const bodyHeight = lampHeight;
  const bodyDepth = 0.18;

  addBox(
    group,
    bodyWidth,
    bodyHeight,
    bodyDepth,
    COLORS.lampShade,
    0,
    bodyHeight / 2 + 0.12,
    0
  );

  // ==========================================
  // INNER GLOWING PANEL
  // ==========================================

  const glowWidth = 0.16;
  const glowHeight = lampHeight - 0.25;

  const glowPanel = addBox(
    group,
    glowWidth,
    glowHeight,
    0.025,
    COLORS.lampGlow,
    0,
    bodyHeight / 2 + 0.12,
    -bodyDepth / 2 - 0.015
  );
  glowPanel.material.emissive.setHex(COLORS.lampGlow);
  glowPanel.material.emissiveIntensity = 0.1;

  const panelLight = new THREE.PointLight(COLORS.lampGlow, lightIntensity, 4);
  panelLight.position.set(
    0,
    bodyHeight / 2 + 0.12,
    -bodyDepth / 2 - 0.03
  );
  group.add(panelLight);

  // ==========================================
  // TOP CAP
  // ==========================================

  addBox(
    group,
    bodyWidth + 0.04,
    0.10,
    bodyDepth + 0.04,
    COLORS.lampBase,
    0,
    lampHeight + 0.12,
    0
  );

  // ==========================================
  // BOTTOM CAP
  // ==========================================

  addBox(
    group,
    bodyWidth + 0.04,
    0.10,
    bodyDepth + 0.04,
    COLORS.lampBase,
    0,
    0.17,
    0
  );

  return group;
}
function createLEDText(scene) {

  const group = createFurnitureGroup(
    scene,
    "ledText",
    0,
    0,
    0
  );

  const loader = new FontLoader();

  loader.load(
    "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/fonts/helvetiker_bold.typeface.json",
    function (font) {

      const geometry = new TextGeometry("EMC111", {
        font: font,
        size: 0.7,
        height: 0.05,
        curveSegments: 8,
        bevelEnabled: true,
        bevelThickness: 0.01,
        bevelSize: 0.008,
        bevelSegments: 3
      });

      // ==========================================
      // CENTER TEXT
      // ==========================================

      geometry.computeBoundingBox();

      const textWidth =
        geometry.boundingBox.max.x -
        geometry.boundingBox.min.x;

      geometry.translate(
        -textWidth / 2,
        0,
        0
      );

      // ==========================================
      // MATERIAL
      // ==========================================

      // Preserve the LED sign's self-lit appearance.
      const material = new THREE.MeshBasicMaterial({
        color: 0xff00cc
      });

      const textMesh = new THREE.Mesh(
        geometry,
        material
      );

      // ==========================================
      // POSITION
      // ==========================================

      textMesh.position.set(
        0,
        2.5,
        HALF_DEPTH - WALL_THICKNESS / 2 - 0.08
      );

      // ==========================================
      // FACE INTO THE ROOM
      // ==========================================

      textMesh.rotation.y = Math.PI;

      group.add(textMesh);

      const text = "EMC111";
      const fontResolution = font.data.resolution || 1000;
      const totalAdvance = Array.from(text).reduce(function (total, character) {
        return total + (font.data.glyphs[character].ha / fontResolution) * 0.7;
      }, 0);
      let letterOffset = 0;

      Array.from(text).forEach(function (character) {
        const letterAdvance =
          (font.data.glyphs[character].ha / fontResolution) * 0.7;
        const letterCenterX =
          letterOffset + letterAdvance / 2 - totalAdvance / 2;
        const letterGlow = new THREE.PointLight(0xff00cc, 0.3, 1.2);

        letterGlow.position.set(
          -letterCenterX,
          2.85,
          HALF_DEPTH - WALL_THICKNESS / 2 - 0.3
        );
        group.add(letterGlow);
        letterOffset += letterAdvance;
      });
    }
  );

  return group;
}

function buildRoom(scene) {
  createFloor(scene);
  createCeiling(scene);
  createWalls(scene);
  createLEDText(scene);
  createPosters(scene);
  createRoundCarpet(scene);
  createConsoleTable(scene);
  createSpeakers(scene);
  createWallTv(scene);
  createPottedPlant(scene, "pottedPlant1", -3.7, -4.1);
  createPottedPlant(scene, "pottedPlant2", 3.4, -4.1);
  createLCouch(scene);
  createCouchPillows(scene);
  createBeanbag(scene);
  createTable(scene);
  createGamingSetup(scene);
  createGamingChair(scene);
  createBookshelf(scene);
  createFloorLamp(scene);
  createFloorLamp(
    scene,
    "gamingFloorLampSmall",
    -6.6,
    -3.9,
    0.8,
    -3 * Math.PI / 4,
    0.5
  );
  createDoor(scene);
}

// ---------------------------------------------------------------------------
// Camera controls (first person, mouse look + WASD movement)
// ---------------------------------------------------------------------------
function setupFirstPersonControls(camera, domElement, scene) {
  const keys = {};
  const colliders = [];
  const colliderBounds = new THREE.Box3();

  scene.updateMatrixWorld(true);
  scene.traverse(function (object) {
    if (!object.isMesh) {
      return;
    }

    colliderBounds.setFromObject(object);
    if (colliderBounds.max.y <= 0.05 || colliderBounds.min.y >= PLAYER_BODY_HEIGHT) {
      return;
    }

    colliders.push(colliderBounds.clone());
  });

  function canOccupy(positionX, positionZ) {
    return !colliders.some(function (bounds) {
      const closestX = Math.max(bounds.min.x, Math.min(positionX, bounds.max.x));
      const closestZ = Math.max(bounds.min.z, Math.min(positionZ, bounds.max.z));
      const distanceX = positionX - closestX;
      const distanceZ = positionZ - closestZ;

      return distanceX * distanceX + distanceZ * distanceZ < PLAYER_RADIUS * PLAYER_RADIUS;
    });
  }

  let yaw = 0;
  let pitch = 0;
  let pendingMouseX = 0;
  let pendingMouseY = 0;

  window.addEventListener("keydown", function (event) {
    keys[event.code] = true;
  });

  window.addEventListener("keyup", function (event) {
    keys[event.code] = false;
  });

  domElement.addEventListener("click", function () {
    if (document.pointerLockElement !== domElement) {
      domElement.requestPointerLock();
    }
  });

  document.addEventListener("mousemove", function (event) {
    if (document.pointerLockElement !== domElement) {
      return;
    }

    if (!Number.isFinite(event.movementX) || !Number.isFinite(event.movementY)) {
      return;
    }

    pendingMouseX += event.movementX;
    pendingMouseY += event.movementY;
    pendingMouseX = Math.max(-MAX_MOUSE_DELTA_PER_FRAME, Math.min(MAX_MOUSE_DELTA_PER_FRAME, pendingMouseX));
    pendingMouseY = Math.max(-MAX_MOUSE_DELTA_PER_FRAME, Math.min(MAX_MOUSE_DELTA_PER_FRAME, pendingMouseY));
  });

  document.addEventListener("pointerlockchange", function () {
    pendingMouseX = 0;
    pendingMouseY = 0;
  });

  function updateLook() {
    yaw -= pendingMouseX * MOUSE_SENSITIVITY;
    pitch -= pendingMouseY * MOUSE_SENSITIVITY;
    pendingMouseX = 0;
    pendingMouseY = 0;

    const maxPitch = Math.PI / 2 - 0.01;
    pitch = Math.max(-maxPitch, Math.min(maxPitch, pitch));
  }

  camera.position.set(0, PLAYER_HEIGHT, 3);
  camera.rotation.order = "YXZ";

  return function updatePlayer(deltaTime) {
    updateLook();

    const forward = new THREE.Vector3(
      -Math.sin(yaw),
      0,
      -Math.cos(yaw)
    );
    const right = new THREE.Vector3(
      Math.cos(yaw),
      0,
      -Math.sin(yaw)
    );

    const movement = new THREE.Vector3();

    if (keys["KeyW"]) {
      movement.add(forward);
    }

    if (keys["KeyS"]) {
      movement.sub(forward);
    }

    if (keys["KeyA"]) {
      movement.sub(right);
    }

    if (keys["KeyD"]) {
      movement.add(right);
    }

    const sprinting =
      movement.lengthSq() > 0 &&
      (keys["ShiftLeft"] || keys["ShiftRight"]);
    const targetFov = sprinting ? SPRINT_CAMERA_FOV : CAMERA_FOV;
    const fovBlend = 1 - Math.exp(-8 * Math.min(deltaTime, 0.1));
    camera.fov += (targetFov - camera.fov) * fovBlend;
    camera.updateProjectionMatrix();

    if (movement.length() > 0) {
      movement.normalize();
      const speed = MOVE_SPEED * (sprinting ? SPRINT_MULTIPLIER : 1);
      movement.multiplyScalar(speed * Math.min(deltaTime, 0.1));

      const stepCount = Math.max(1, Math.ceil(movement.length() / (PLAYER_RADIUS / 2)));
      const stepX = movement.x / stepCount;
      const stepZ = movement.z / stepCount;

      for (let step = 0; step < stepCount; step++) {
        const nextX = camera.position.x + stepX;
        if (canOccupy(nextX, camera.position.z)) {
          camera.position.x = nextX;
        }

        const nextZ = camera.position.z + stepZ;
        if (canOccupy(camera.position.x, nextZ)) {
          camera.position.z = nextZ;
        }
      }
    }

    camera.position.y = PLAYER_HEIGHT;

    camera.rotation.set(pitch, yaw, 0, "YXZ");
  };
}

// ---------------------------------------------------------------------------
// Setup & render loop
// ---------------------------------------------------------------------------
function initialize() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BACKGROUND_COLOR);

  const camera = new THREE.PerspectiveCamera(
    CAMERA_FOV, window.innerWidth / window.innerHeight, CAMERA_NEAR, CAMERA_FAR
  );

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0x8f72c9, 0.02));

  buildRoom(scene);

  const updatePlayer = setupFirstPersonControls(
    camera,
    renderer.domElement,
    scene
  );

  const onWindowResize = function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener("resize", onWindowResize);

  const clock = new THREE.Clock();
  const pcRgbAccent = scene.getObjectByName("pcRgbAccent");
  const pcRgbLight = scene.getObjectByName("pcRgbAccentLight");
  let rgbHue = 0;

  const animate = function () {
    requestAnimationFrame(animate);

    const deltaTime = clock.getDelta();
    rgbHue = (rgbHue + deltaTime * 0.15) % 1;
    const rgbColor = new THREE.Color().setHSL(rgbHue, 1, 0.5);
    pcRgbAccent.material.emissive.copy(rgbColor);
    pcRgbLight.color.copy(rgbColor);
    speakerRgbRims.forEach(function (rim) {
      rim.material.color.copy(rgbColor);
      rim.material.emissive.copy(rgbColor);
    });

    updatePlayer(deltaTime);

    renderer.render(scene, camera);
  };

  animate();
}

initialize();