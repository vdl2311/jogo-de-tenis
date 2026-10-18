/**
 * 3D Tennis Court, Stadium, Character Models, Physics and Match Simulation
 * Built strictly according to Three.js Architecture & Quality Directives.
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CourtSurface, Difficulty, GestureType, TennisScore } from '../types';
import { soundManager } from '../audio/soundManager';

export interface TennisSceneCallbacks {
  onScoreUpdate: (score: TennisScore) => void;
  onPointEnd: (winner: 'player' | 'opponent', reason: string, isAce: boolean) => void;
  onGameWon: (winner: 'player' | 'opponent', playerGames: number, opponentGames: number) => void;
  onMatchWon: (winner: 'player' | 'opponent') => void;
  onRallyCount: (count: number) => void;
  onBallSpeed: (kmh: number) => void;
  onCommentary: (text: string) => void;
}

export class TennisScene {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;
  private animFrameId: number | null = null;
  private isDisposed: boolean = false;

  private callbacks: TennisSceneCallbacks;

  // Stadium & Court objects
  private courtMesh!: THREE.Mesh;
  private netMesh!: THREE.Mesh;
  private surfaceType: CourtSurface = 'HARD_COURT';

  // 3D Actors
  private playerGroup!: THREE.Group;
  private playerRacket!: THREE.Group;
  private playerRightArm!: THREE.Group;
  private playerLeftArm!: THREE.Group;
  private playerLegLeft!: THREE.Group;
  private playerLegRight!: THREE.Group;

  private opponentGroup!: THREE.Group;
  private opponentRacket!: THREE.Group;
  private opponentRightArm!: THREE.Group;
  private opponentLegLeft!: THREE.Group;
  private opponentLegRight!: THREE.Group;

  // Ball
  private ballMesh!: THREE.Mesh;
  private ballShadow!: THREE.Mesh;
  private ballTrail: THREE.Mesh[] = [];

  // Physics state
  private ballPos = new THREE.Vector3(0, 1.2, 8.5);
  private ballVel = new THREE.Vector3(0, 0, 0);
  private ballActive: boolean = false;
  private ballBounces: number = 0;
  private lastHitter: 'player' | 'opponent' | null = null;
  private ballSpeedKmh: number = 0;

  // Gameplay & Serve state
  public score: TennisScore = {
    playerPoints: 0,
    opponentPoints: 0,
    playerGames: 0,
    opponentGames: 0,
    playerSets: 0,
    opponentSets: 0,
    isDeuce: false,
    advantage: null,
    server: 'player',
    serveFaultCount: 0
  };

  public serveState: 'IDLE' | 'TOSS' | 'HIT' | 'RALLY' = 'IDLE';
  private serveTossTime: number = 0;
  private currentRally: number = 0;
  private difficulty: Difficulty = 'MEDIUM';

  // Player input tracking
  private targetPlayerX: number = 0;
  private playerSwingTime: number = 0;
  private playerSwingType: GestureType = 'IDLE';

  // Opponent AI logic
  private opponentTargetX: number = 0;
  private opponentTargetZ: number = -9.5;
  private opponentSwingTime: number = 0;

  // Camera animation
  private baseCamPos = new THREE.Vector3(0, 7.8, 17.5);
  private baseCamLook = new THREE.Vector3(0, 1.0, 0);

  // Regulation Tennis Court Dimensions (scaled: 1 unit ~ 1 meter)
  // Half-court length: 11.885m. Net is at z = 0.
  // Singles sideline: +/- 4.115m. Doubles: +/- 5.485m.
  // Service line: +/- 6.4m.
  private readonly COURT_HALF_LEN = 11.885;
  private readonly COURT_HALF_WIDTH = 4.115;
  private readonly SERVICE_LINE = 6.4;
  private readonly NET_HEIGHT = 0.95;

  constructor(container: HTMLElement, callbacks: TennisSceneCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    // 1. Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a101d);
    this.scene.fog = new THREE.FogExp2(0x0a101d, 0.012);

    const aspect = container.clientWidth / container.clientHeight || 16 / 9;
    this.camera = new THREE.PerspectiveCamera(46, aspect, 0.1, 150);
    this.camera.position.copy(this.baseCamPos);
    this.camera.lookAt(this.baseCamLook);

    // 2. Renderer with modern PBR & Color Pipeline
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);
    this.clock = new THREE.Clock();

    // 3. Studio Environment Map
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 4. Lights
    this.setupLighting();

    // 5. Build Stadium, Court & Actors
    this.buildStadium();
    this.buildTennisCourt();
    this.buildPlayers();
    this.buildBall();

    // Pre-warm shaders
    this.renderer.compile(this.scene, this.camera);

    // 6. Start Loop
    this.renderLoop();

    window.addEventListener('resize', this.onResize);

    // Initial serve setup
    this.prepareServe();
  }

  private setupLighting() {
    // Warm key light
    const keyLight = new THREE.DirectionalLight(0xfff6e6, 2.4);
    keyLight.position.set(12, 22, 16);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 5;
    keyLight.shadow.camera.far = 60;
    keyLight.shadow.camera.left = -16;
    keyLight.shadow.camera.right = 16;
    keyLight.shadow.camera.top = 22;
    keyLight.shadow.camera.bottom = -22;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    this.scene.add(keyLight);

    // Cool rim light from opponent end
    const rimLight = new THREE.DirectionalLight(0x7dd3fc, 1.2);
    rimLight.position.set(-14, 18, -20);
    this.scene.add(rimLight);

    // Hemisphere light for natural ambient fill
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x1e293b, 0.85);
    this.scene.add(hemiLight);

    // Stadium Floodlights (4 tower glow accents)
    const towerPositions = [
      [-18, 16, -18],
      [18, 16, -18],
      [-18, 16, 18],
      [18, 16, 18]
    ];
    towerPositions.forEach(([x, y, z]) => {
      const flood = new THREE.PointLight(0xffffff, 0.6, 35);
      flood.position.set(x, y, z);
      this.scene.add(flood);
    });
  }

  // Procedural Stadium with spectator tiers and LED banners
  private buildStadium() {
    const stadiumGroup = new THREE.Group();

    // Grandstand bleachers
    const standMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.8,
      metalness: 0.1
    });

    const seatMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.6,
      metalness: 0.2
    });

    // 4 stadium stands (Left, Right, North, South)
    const sides = [
      { pos: [-16, 4, 0], rot: [0, Math.PI / 2, 0], len: 36 },
      { pos: [16, 4, 0], rot: [0, -Math.PI / 2, 0], len: 36 },
      { pos: [0, 5, -24], rot: [0, 0, 0], len: 32 }
    ];

    sides.forEach(s => {
      const stand = new THREE.Group();
      for (let i = 0; i < 7; i++) {
        const step = new THREE.Mesh(
          new THREE.BoxGeometry(s.len, 0.8, 1.4),
          standMat
        );
        step.position.set(0, i * 0.8, -i * 1.3);
        stand.add(step);

        // Seating bench
        const bench = new THREE.Mesh(
          new THREE.BoxGeometry(s.len * 0.96, 0.2, 0.6),
          seatMat
        );
        bench.position.set(0, i * 0.8 + 0.45, -i * 1.3 + 0.2);
        stand.add(bench);
      }
      stand.position.set(s.pos[0], s.pos[1], s.pos[2]);
      stand.rotation.set(s.rot[0], s.rot[1], s.rot[2]);
      stadiumGroup.add(stand);
    });

    // Digital LED sponsor boards around court edge
    const ledCanvas = document.createElement('canvas');
    ledCanvas.width = 1024;
    ledCanvas.height = 128;
    const lCtx = ledCanvas.getContext('2d')!;
    lCtx.fillStyle = '#0f172a';
    lCtx.fillRect(0, 0, 1024, 128);
    lCtx.fillStyle = '#22c55e';
    lCtx.font = 'bold 38px "Chakra Petch", sans-serif';
    lCtx.fillText('GRAND SLAM MOTION • TENNIS 3D • ACTIVE LIVING • BODY TRACKING', 40, 80);

    const ledTexture = new THREE.CanvasTexture(ledCanvas);
    ledTexture.colorSpace = THREE.SRGBColorSpace;
    const ledMat = new THREE.MeshStandardMaterial({
      map: ledTexture,
      roughness: 0.3,
      metalness: 0.6,
      emissive: 0x064e3b,
      emissiveIntensity: 0.4
    });

    const northBoard = new THREE.Mesh(new THREE.BoxGeometry(26, 1.2, 0.3), ledMat);
    northBoard.position.set(0, 0.6, -16.5);
    stadiumGroup.add(northBoard);

    const eastBoard = new THREE.Mesh(new THREE.BoxGeometry(34, 1.2, 0.3), ledMat);
    eastBoard.position.set(10.5, 0.6, 0);
    eastBoard.rotation.y = Math.PI / 2;
    stadiumGroup.add(eastBoard);

    const westBoard = new THREE.Mesh(new THREE.BoxGeometry(34, 1.2, 0.3), ledMat);
    westBoard.position.set(-10.5, 0.6, 0);
    westBoard.rotation.y = -Math.PI / 2;
    stadiumGroup.add(westBoard);

    // Referee Chair
    const umpireChair = new THREE.Group();
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8, roughness: 0.2 });
    const ladder = new THREE.Mesh(new THREE.BoxGeometry(0.8, 3.2, 0.8), frameMat);
    ladder.position.set(0, 1.6, 0);
    const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 1.2), new THREE.MeshStandardMaterial({ color: 0x10b981 }));
    chairSeat.position.set(0, 3.2, 0);
    umpireChair.add(ladder, chairSeat);
    umpireChair.position.set(-6.8, 0, 0);
    stadiumGroup.add(umpireChair);

    this.scene.add(stadiumGroup);
  }

  // Realistic Procedural Tennis Court
  private buildTennisCourt() {
    // High-resolution procedural court texture
    const cWidth = 2048;
    const cHeight = 4096;
    const canvas = document.createElement('canvas');
    canvas.width = cWidth;
    canvas.height = cHeight;
    const ctx = canvas.getContext('2d')!;

    this.renderCourtTexture(ctx, cWidth, cHeight, this.surfaceType);

    const courtTexture = new THREE.CanvasTexture(canvas);
    courtTexture.colorSpace = THREE.SRGBColorSpace;
    courtTexture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();

    const courtMat = new THREE.MeshStandardMaterial({
      map: courtTexture,
      roughness: this.surfaceType === 'GRASS' ? 0.7 : (this.surfaceType === 'CLAY' ? 0.85 : 0.45),
      metalness: 0.05
    });

    // Regulation court + apron
    const courtGeo = new THREE.PlaneGeometry(18, 32);
    this.courtMesh = new THREE.Mesh(courtGeo, courtMat);
    this.courtMesh.rotation.x = -Math.PI / 2;
    this.courtMesh.position.y = 0;
    this.courtMesh.receiveShadow = true;
    this.scene.add(this.courtMesh);

    // 3D Tennis Net
    this.buildTennisNet();
  }

  private renderCourtTexture(ctx: CanvasRenderingContext2D, w: number, h: number, surface: CourtSurface) {
    // Outer apron color
    if (surface === 'HARD_COURT') {
      ctx.fillStyle = '#1e3a8a'; // Deep Australian Blue apron
    } else if (surface === 'CLAY') {
      ctx.fillStyle = '#9a3412'; // Clay terracotta apron
    } else {
      ctx.fillStyle = '#14532d'; // Wimbledon emerald grass apron
    }
    ctx.fillRect(0, 0, w, h);

    // Playable court inner rectangle
    const courtX = w * 0.16;
    const courtY = h * 0.12;
    const courtW = w * 0.68;
    const courtH = h * 0.76;

    if (surface === 'HARD_COURT') {
      ctx.fillStyle = '#0284c7'; // Vivid Court Blue
    } else if (surface === 'CLAY') {
      ctx.fillStyle = '#c2410c'; // Red clay
    } else {
      ctx.fillStyle = '#15803d'; // Green lawn
    }
    ctx.fillRect(courtX, courtY, courtW, courtH);

    // Add subtle procedural noise grain for realism
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const grain = (Math.random() - 0.5) * 8;
      data[i] = Math.max(0, Math.min(255, data[i] + grain));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + grain));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + grain));
    }
    ctx.putImageData(imgData, 0, 0);

    // White regulation court lines
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 14;

    // Doubles outer perimeter
    ctx.strokeRect(courtX, courtY, courtW, courtH);

    // Singles sidelines
    const singlesInset = courtW * 0.125;
    ctx.beginPath();
    ctx.moveTo(courtX + singlesInset, courtY);
    ctx.lineTo(courtX + singlesInset, courtY + courtH);
    ctx.moveTo(courtX + courtW - singlesInset, courtY);
    ctx.lineTo(courtX + courtW - singlesInset, courtY + courtH);
    ctx.stroke();

    // Center net line
    const netY = h * 0.5;
    ctx.beginPath();
    ctx.moveTo(courtX, netY);
    ctx.lineTo(courtX + courtW, netY);
    ctx.stroke();

    // Service lines (halfway between net and baseline)
    const serviceDist = courtH * 0.27;
    const serviceY1 = netY - serviceDist;
    const serviceY2 = netY + serviceDist;

    ctx.beginPath();
    ctx.moveTo(courtX + singlesInset, serviceY1);
    ctx.lineTo(courtX + courtW - singlesInset, serviceY1);
    ctx.moveTo(courtX + singlesInset, serviceY2);
    ctx.lineTo(courtX + courtW - singlesInset, serviceY2);
    ctx.stroke();

    // Center service line
    const centerX = w * 0.5;
    ctx.beginPath();
    ctx.moveTo(centerX, serviceY1);
    ctx.lineTo(centerX, serviceY2);
    ctx.stroke();

    // Center marks at baselines
    ctx.beginPath();
    ctx.moveTo(centerX, courtY);
    ctx.lineTo(centerX, courtY + 36);
    ctx.moveTo(centerX, courtY + courtH);
    ctx.lineTo(centerX, courtY + courtH - 36);
    ctx.stroke();
  }

  public setCourtSurface(surface: CourtSurface) {
    this.surfaceType = surface;
    const cWidth = 2048;
    const cHeight = 4096;
    const canvas = document.createElement('canvas');
    canvas.width = cWidth;
    canvas.height = cHeight;
    const ctx = canvas.getContext('2d')!;
    this.renderCourtTexture(ctx, cWidth, cHeight, surface);

    const newTex = new THREE.CanvasTexture(canvas);
    newTex.colorSpace = THREE.SRGBColorSpace;
    newTex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    (this.courtMesh.material as THREE.MeshStandardMaterial).map = newTex;
    (this.courtMesh.material as THREE.MeshStandardMaterial).needsUpdate = true;
  }

  // 3D Tennis Net with posts and center strap
  private buildTennisNet() {
    const netGroup = new THREE.Group();

    // Net posts (metal cylinders)
    const postMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.9,
      roughness: 0.2
    });
    const postGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.25, 16);

    const postLeft = new THREE.Mesh(postGeo, postMat);
    postLeft.position.set(-5.6, 0.6, 0);
    postLeft.castShadow = true;

    const postRight = new THREE.Mesh(postGeo, postMat);
    postRight.position.set(5.6, 0.6, 0);
    postRight.castShadow = true;

    netGroup.add(postLeft, postRight);

    // Procedural net mesh texture
    const nCanvas = document.createElement('canvas');
    nCanvas.width = 64;
    nCanvas.height = 64;
    const nCtx = nCanvas.getContext('2d')!;
    nCtx.fillStyle = 'rgba(20, 20, 25, 0.92)';
    nCtx.fillRect(0, 0, 64, 64);
    nCtx.strokeStyle = 'rgba(240, 240, 240, 0.75)';
    nCtx.lineWidth = 3;
    nCtx.strokeRect(0, 0, 64, 64);

    const nTex = new THREE.CanvasTexture(nCanvas);
    nTex.wrapS = THREE.RepeatWrapping;
    nTex.wrapT = THREE.RepeatWrapping;
    nTex.repeat.set(120, 10);

    const netMat = new THREE.MeshStandardMaterial({
      map: nTex,
      transparent: true,
      opacity: 0.88,
      roughness: 0.8,
      side: THREE.DoubleSide
    });

    const netPlane = new THREE.Mesh(new THREE.PlaneGeometry(11.2, 0.95), netMat);
    netPlane.position.set(0, 0.475, 0);
    netPlane.castShadow = true;
    netGroup.add(netPlane);

    // White Top Canvas Tape
    const tapeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    const topTape = new THREE.Mesh(new THREE.BoxGeometry(11.2, 0.07, 0.05), tapeMat);
    topTape.position.set(0, 0.95, 0);
    topTape.castShadow = true;
    netGroup.add(topTape);

    // Center Strap
    const centerStrap = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.95, 0.06), tapeMat);
    centerStrap.position.set(0, 0.475, 0);
    netGroup.add(centerStrap);

    this.scene.add(netGroup);
  }

  // 3–12 Part Procedural Player and Opponent Models
  private buildPlayers() {
    // 1. User Player Model (Bottom side: z ~ 10.5)
    this.playerGroup = this.createCharacter(0x2563eb, 0x10b981, 'PLAYER');
    this.playerGroup.position.set(0, 0, 10.5);
    this.scene.add(this.playerGroup);

    // 2. Opponent AI Model (Top side: z ~ -10.5)
    this.opponentGroup = this.createCharacter(0xd97706, 0xef4444, 'OPPONENT');
    this.opponentGroup.position.set(0, 0, -10.5);
    this.opponentGroup.rotation.y = Math.PI; // Faces player
    this.scene.add(this.opponentGroup);
  }

  private createCharacter(shirtColor: number, accentColor: number, type: 'PLAYER' | 'OPPONENT'): THREE.Group {
    const char = new THREE.Group();

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.7 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.5 });
    const shortsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    const headMat = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.4 });

    // Torso (athletic shirt)
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 0.75, 12), shirtMat);
    torso.position.y = 1.35;
    torso.castShadow = true;
    char.add(torso);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), skinMat);
    head.position.y = 1.95;
    head.castShadow = true;
    char.add(head);

    // Headband
    const headband = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.205, 0.06, 16), headMat);
    headband.position.y = 2.0;
    char.add(headband);

    // Shorts / Hips
    const hips = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.26, 0.3, 12), shortsMat);
    hips.position.y = 0.95;
    hips.castShadow = true;
    char.add(hips);

    // Left Leg
    const legL = new THREE.Group();
    const thighL = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.5, 10), skinMat);
    thighL.position.y = -0.25;
    const shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.3), shoeMat);
    shoeL.position.set(0, -0.75, 0.05);
    legL.add(thighL, shoeL);
    legL.position.set(-0.16, 0.85, 0);
    char.add(legL);

    // Right Leg
    const legR = new THREE.Group();
    const thighR = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.5, 10), skinMat);
    thighR.position.y = -0.25;
    const shoeR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.3), shoeMat);
    shoeR.position.set(0, -0.75, 0.05);
    legR.add(thighR, shoeR);
    legR.position.set(0.16, 0.85, 0);
    char.add(legR);

    // Left Arm (balance)
    const armL = new THREE.Group();
    const limbL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.6, 10), skinMat);
    limbL.position.y = -0.3;
    armL.add(limbL);
    armL.position.set(-0.38, 1.6, 0);
    armL.rotation.z = 0.3;
    char.add(armL);

    // Right Arm (holds racket)
    const armR = new THREE.Group();
    const limbR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.6, 10), skinMat);
    limbR.position.y = -0.3;
    armR.add(limbR);
    armR.position.set(0.38, 1.6, 0);

    // 3D Tennis Racket
    const racket = this.createRacket(accentColor);
    racket.position.set(0, -0.65, 0.15);
    racket.rotation.x = Math.PI / 2.8;
    armR.add(racket);
    char.add(armR);

    if (type === 'PLAYER') {
      this.playerRightArm = armR;
      this.playerLeftArm = armL;
      this.playerLegLeft = legL;
      this.playerLegRight = legR;
      this.playerRacket = racket;
    } else {
      this.opponentRightArm = armR;
      this.opponentLegLeft = legL;
      this.opponentLegRight = legR;
      this.opponentRacket = racket;
    }

    // Contact Ground Shadow beneath character
    const shadowGeo = new THREE.CircleGeometry(0.65, 16);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.45,
      depthWrite: false
    });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0.015;
    char.add(shadowPlane);

    return char;
  }

  // Realistic Procedural Tennis Racket
  private createRacket(accentColor: number): THREE.Group {
    const racketGroup = new THREE.Group();

    // Grip handle
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.035, 0.38, 8), gripMat);
    grip.position.y = 0.19;
    racketGroup.add(grip);

    // Frame (shaft & hoop)
    const frameMat = new THREE.MeshStandardMaterial({
      color: accentColor,
      metalness: 0.8,
      roughness: 0.25
    });

    // Throat
    const throat = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.18, 8), frameMat);
    throat.position.y = 0.42;
    racketGroup.add(throat);

    // Oval Racket Head (Torus)
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.022, 8, 24), frameMat);
    hoop.scale.set(0.85, 1.25, 1);
    hoop.position.y = 0.68;
    racketGroup.add(hoop);

    // Transparent Strings Mesh
    const stringsMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.4,
      wireframe: true,
      roughness: 0.1
    });
    const strings = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.54, 8, 12), stringsMat);
    strings.position.y = 0.68;
    racketGroup.add(strings);

    return racketGroup;
  }

  // 3D Tennis Ball with optic yellow felt & procedural seam
  private buildBall() {
    const bCanvas = document.createElement('canvas');
    bCanvas.width = 256;
    bCanvas.height = 128;
    const bCtx = bCanvas.getContext('2d')!;
    // Optic fluorescent yellow
    bCtx.fillStyle = '#ccff00';
    bCtx.fillRect(0, 0, 256, 128);
    // White curved seam
    bCtx.strokeStyle = '#f8fafc';
    bCtx.lineWidth = 10;
    bCtx.beginPath();
    bCtx.arc(64, 64, 45, -Math.PI / 2, Math.PI / 2);
    bCtx.stroke();
    bCtx.beginPath();
    bCtx.arc(192, 64, 45, Math.PI / 2, -Math.PI / 2);
    bCtx.stroke();

    const ballTex = new THREE.CanvasTexture(bCanvas);
    ballTex.colorSpace = THREE.SRGBColorSpace;

    const ballMat = new THREE.MeshStandardMaterial({
      map: ballTex,
      roughness: 0.75,
      metalness: 0.05
    });

    this.ballMesh = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), ballMat);
    this.ballMesh.castShadow = true;
    this.ballMesh.position.copy(this.ballPos);
    this.scene.add(this.ballMesh);

    // Contact shadow beneath ball
    const bShadowGeo = new THREE.CircleGeometry(0.15, 16);
    const bShadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.5,
      depthWrite: false
    });
    this.ballShadow = new THREE.Mesh(bShadowGeo, bShadowMat);
    this.ballShadow.rotation.x = -Math.PI / 2;
    this.ballShadow.position.set(0, 0.02, 0);
    this.scene.add(this.ballShadow);
  }

  public setDifficulty(diff: Difficulty) {
    this.difficulty = diff;
  }

  // Set user target position from motion detector
  public updatePlayerMotion(x: number) {
    // Map -1..1 to court singles width +/- 3.8m
    this.targetPlayerX = x * 3.8;
  }

  // Trigger swing from motion gesture
  public triggerPlayerStroke(gesture: GestureType, power: number = 0.8) {
    if (this.serveState === 'IDLE' && this.score.server === 'player') {
      // Initiate serve
      this.tossServe();
      return;
    }

    if (this.serveState === 'TOSS' && this.score.server === 'player') {
      // Hit serve during ball descent
      this.hitServe(power);
      return;
    }

    // Normal Rally Hit
    this.playerSwingType = gesture;
    this.playerSwingTime = performance.now();

    // Check hit distance to ball
    const dist = this.playerGroup.position.distanceTo(this.ballPos);
    const canHit = this.ballPos.z > 2.0 && this.ballPos.z < 12.0 && dist < 3.2 && this.ballActive && this.lastHitter !== 'player';

    if (canHit) {
      this.executePlayerReturn(gesture, power);
    }
  }

  private tossServe() {
    this.serveState = 'TOSS';
    this.serveTossTime = performance.now();
    this.ballActive = true;
    this.ballBounces = 0;
    this.lastHitter = 'player';

    // Ball toss straight up in front of player
    this.ballPos.set(this.playerGroup.position.x + 0.35, 1.4, this.playerGroup.position.z - 0.5);
    this.ballVel.set(0.1, 8.2, -0.4);
    soundManager.playServeWhoosh();
    this.callbacks.onCommentary('BOLA NO ALTO! LEVANTE O BRAÇO PARA SACAR!');
  }

  private hitServe(power: number) {
    if (this.ballPos.y < 1.8) {
      // Missed serve timing
      this.callbacks.onCommentary('FALTA DE SAQUE: BOLA CAIU!');
      soundManager.playCrowdOoh();
      this.handleFault('Saque na rede ou fora do tempo');
      return;
    }

    this.serveState = 'RALLY';
    this.lastHitter = 'player';
    this.currentRally = 1;
    this.callbacks.onRallyCount(1);

    const speed = 26 + power * 14; // ~140 to 190 km/h
    this.ballSpeedKmh = Math.round(speed * 3.6);
    this.callbacks.onBallSpeed(this.ballSpeedKmh);

    // Aim towards opposite diagonal service box
    const targetX = (Math.random() - 0.5) * 2.8;
    const targetZ = -this.SERVICE_LINE * (0.6 + Math.random() * 0.35);

    const timeToTarget = 0.52;
    this.ballVel.set(
      (targetX - this.ballPos.x) / timeToTarget,
      -1.2,
      (targetZ - this.ballPos.z) / timeToTarget
    );

    soundManager.playRacketHit(power, true);
    this.callbacks.onCommentary(`SAQUE VELOZ! ${this.ballSpeedKmh} KM/H`);
  }

  private executePlayerReturn(gesture: GestureType, power: number) {
    this.lastHitter = 'player';
    this.currentRally++;
    this.callbacks.onRallyCount(this.currentRally);

    // Calculate ball return angle based on stroke type and player lateral position
    let targetX = (Math.random() - 0.5) * 6.5;
    if (gesture === 'FOREHAND') {
      targetX = -1.8 - Math.random() * 2.0; // Crosscourt left
    } else if (gesture === 'BACKHAND') {
      targetX = 1.8 + Math.random() * 2.0; // Crosscourt right
    }

    const targetZ = -this.COURT_HALF_LEN * (0.75 + Math.random() * 0.22);
    const speed = 20 + power * 12;
    this.ballSpeedKmh = Math.round(speed * 3.6);
    this.callbacks.onBallSpeed(this.ballSpeedKmh);

    const timeToTarget = Math.max(0.48, (targetZ - this.ballPos.z) / -speed);
    const g = 13.0; // Custom gravity
    const vy = (0.9 - this.ballPos.y + 0.5 * g * timeToTarget * timeToTarget) / timeToTarget;

    this.ballVel.set(
      (targetX - this.ballPos.x) / timeToTarget,
      vy,
      (targetZ - this.ballPos.z) / timeToTarget
    );

    this.ballBounces = 0;
    soundManager.playRacketHit(power, power > 0.85);

    // Animate swing
    this.animateRacketSwing(this.playerRightArm, gesture);
  }

  // Opponent AI behavior
  private updateOpponentAI(dt: number) {
    // If opponent is serving
    if (this.serveState === 'IDLE' && this.score.server === 'opponent') {
      this.opponentServe();
      return;
    }

    // Move towards predicted ball position
    if (this.ballActive && this.ballVel.z < 0) {
      // Ball is coming towards opponent
      const predictTime = Math.max(0, (-this.COURT_HALF_LEN - this.ballPos.z) / this.ballVel.z);
      const predictedX = this.ballPos.x + this.ballVel.x * predictTime;
      this.opponentTargetX = Math.max(-3.8, Math.min(3.8, predictedX));
    } else {
      // Reset to center baseline
      this.opponentTargetX = 0;
    }

    // Move opponent smoothly
    const aiSpeed = this.difficulty === 'HARD' ? 8.5 : (this.difficulty === 'MEDIUM' ? 6.5 : 4.5);
    const dx = this.opponentTargetX - this.opponentGroup.position.x;
    this.opponentGroup.position.x += Math.sign(dx) * Math.min(Math.abs(dx), aiSpeed * dt);

    // Opponent hitting decision
    const distToBall = this.opponentGroup.position.distanceTo(this.ballPos);
    const inHitZone = this.ballPos.z < -6.5 && this.ballPos.z > -12.5 && this.ballActive && this.lastHitter === 'player';

    if (inHitZone && distToBall < 3.2 && this.ballPos.y < 2.5) {
      this.executeOpponentReturn();
    }
  }

  private opponentServe() {
    this.serveState = 'RALLY';
    this.lastHitter = 'opponent';
    this.ballActive = true;
    this.ballBounces = 0;
    this.currentRally = 1;
    this.callbacks.onRallyCount(1);

    this.ballPos.set(this.opponentGroup.position.x - 0.3, 2.2, this.opponentGroup.position.z + 0.5);

    const targetX = (Math.random() - 0.5) * 3.5;
    const targetZ = this.SERVICE_LINE * (0.6 + Math.random() * 0.35);
    const speed = 24 + Math.random() * 8;
    this.ballSpeedKmh = Math.round(speed * 3.6);
    this.callbacks.onBallSpeed(this.ballSpeedKmh);

    const timeToTarget = 0.58;
    const g = 13.0;
    const vy = (0.7 - this.ballPos.y + 0.5 * g * timeToTarget * timeToTarget) / timeToTarget;

    this.ballVel.set(
      (targetX - this.ballPos.x) / timeToTarget,
      vy,
      (targetZ - this.ballPos.z) / timeToTarget
    );

    soundManager.playRacketHit(0.85);
    this.callbacks.onCommentary('ADVERSÁRIO SACOU! PREPARE-SE PARA RECEBER!');
  }

  private executeOpponentReturn() {
    this.lastHitter = 'opponent';
    this.currentRally++;
    this.callbacks.onRallyCount(this.currentRally);

    // Opponent miss chance based on difficulty
    const missChance = this.difficulty === 'EASY' ? 0.28 : (this.difficulty === 'MEDIUM' ? 0.12 : 0.04);
    if (Math.random() < missChance) {
      // Miss or hit out
      this.ballVel.x += (Math.random() - 0.5) * 8;
      this.ballVel.z *= -0.7;
      soundManager.playRacketHit(0.5);
      return;
    }

    const targetX = (Math.random() - 0.5) * 6.5;
    const targetZ = this.COURT_HALF_LEN * (0.65 + Math.random() * 0.3);
    const speed = 19 + Math.random() * 8;
    this.ballSpeedKmh = Math.round(speed * 3.6);
    this.callbacks.onBallSpeed(this.ballSpeedKmh);

    const timeToTarget = Math.max(0.5, (targetZ - this.ballPos.z) / speed);
    const g = 13.0;
    const vy = (0.8 - this.ballPos.y + 0.5 * g * timeToTarget * timeToTarget) / timeToTarget;

    this.ballVel.set(
      (targetX - this.ballPos.x) / timeToTarget,
      vy,
      (targetZ - this.ballPos.z) / timeToTarget
    );

    this.ballBounces = 0;
    soundManager.playRacketHit(0.85);
    this.animateRacketSwing(this.opponentRightArm, Math.random() > 0.5 ? 'FOREHAND' : 'BACKHAND');
  }

  private animateRacketSwing(armGroup: THREE.Group, gesture: GestureType) {
    if (!armGroup) return;
    const startRot = armGroup.rotation.z;
    armGroup.rotation.x = gesture === 'BACKHAND' ? -0.8 : 0.8;
    armGroup.rotation.z = gesture === 'BACKHAND' ? -0.6 : 1.2;

    setTimeout(() => {
      if (armGroup) {
        armGroup.rotation.x = 0;
        armGroup.rotation.z = startRot;
      }
    }, 280);
  }

  // Ball Physics, Bounce & Line Rule Detection
  private updateBallPhysics(dt: number) {
    if (!this.ballActive) return;

    const g = 13.5; // Tuned gravity
    this.ballVel.y -= g * dt;
    this.ballPos.addScaledVector(this.ballVel, dt);

    // Court Floor Collision & Bounce
    if (this.ballPos.y <= 0.12) {
      this.ballPos.y = 0.12;
      this.ballVel.y = -this.ballVel.y * 0.76; // Elasticity
      this.ballVel.x *= 0.94; // Friction
      this.ballVel.z *= 0.94;
      this.ballBounces++;

      soundManager.playBounce(Math.abs(this.ballVel.y) / 6.0);

      // Check whether bounce is in court or out
      this.checkBounceRules();
    }

    // Net Collision
    if (Math.abs(this.ballPos.z) < 0.25 && this.ballPos.y < this.NET_HEIGHT) {
      soundManager.playNetHit();
      this.ballVel.z = -this.ballVel.z * 0.25;
      this.ballVel.y *= 0.5;
      this.ballActive = false;

      const winner = this.lastHitter === 'player' ? 'opponent' : 'player';
      this.endPoint(winner, 'Bola ficou na rede!');
    }

    // Update ball mesh & shadow position
    this.ballMesh.position.copy(this.ballPos);
    this.ballShadow.position.set(this.ballPos.x, 0.02, this.ballPos.z);
    const shadowScale = Math.max(0.4, 1.4 - this.ballPos.y * 0.25);
    this.ballShadow.scale.set(shadowScale, shadowScale, shadowScale);
  }

  private checkBounceRules() {
    const isInsideSingles = Math.abs(this.ballPos.x) <= this.COURT_HALF_WIDTH;
    const isInsideBaseline = Math.abs(this.ballPos.z) <= this.COURT_HALF_LEN;

    // 1st Bounce Evaluation
    if (this.ballBounces === 1) {
      if (!isInsideSingles || !isInsideBaseline) {
        // Ball landed OUT!
        soundManager.playCrowdOoh();
        const winner = this.lastHitter === 'player' ? 'opponent' : 'player';
        this.endPoint(winner, 'BOLA FORA!');
        return;
      }
    }

    // 2nd Bounce: The other player failed to return
    if (this.ballBounces >= 2) {
      const winner = this.lastHitter!;
      const isWinnerPlayer = winner === 'player';
      if (this.currentRally <= 1) {
        soundManager.playCrowdCheer(true);
        this.endPoint(winner, isWinnerPlayer ? 'ACE ESPETACULAR!' : 'ACE DO ADVERSÁRIO!', true);
      } else {
        soundManager.playCrowdCheer(false);
        this.endPoint(winner, 'VENCEDOR DO PONTO!');
      }
    }
  }

  private handleFault(reason: string) {
    this.ballActive = false;
    this.score.serveFaultCount++;

    if (this.score.serveFaultCount >= 2) {
      // Double fault
      const winner = this.score.server === 'player' ? 'opponent' : 'player';
      this.endPoint(winner, 'DUPLA FALTA!');
    } else {
      this.callbacks.onCommentary(`PRIMEIRA FALTA! (${reason})`);
      setTimeout(() => this.prepareServe(), 1400);
    }
  }

  private endPoint(winner: 'player' | 'opponent', reason: string, isAce = false) {
    this.ballActive = false;
    this.serveState = 'IDLE';

    // Award point according to standard tennis scoring
    this.awardPoint(winner);

    this.callbacks.onPointEnd(winner, reason, isAce);
    soundManager.playScoreChime();

    // Voice announcement
    soundManager.announceVoice(this.getScoreAnnouncement(winner, reason));

    // Next point after brief TV scoreboard replay delay
    setTimeout(() => {
      if (this.isDisposed) return;
      this.prepareServe();
    }, 2400);
  }

  private awardPoint(winner: 'player' | 'opponent') {
    const isPlayer = winner === 'player';
    let p = this.score.playerPoints;
    let o = this.score.opponentPoints;

    // Check Deuce & Advantage
    if (p >= 3 && o >= 3) {
      if (this.score.advantage === null) {
        this.score.advantage = winner;
      } else if (this.score.advantage === winner) {
        // Won the game from advantage!
        this.winGame(winner);
        return;
      } else {
        // Back to Deuce
        this.score.advantage = null;
      }
    } else {
      if (isPlayer) {
        p++;
        if (p > 3 && p >= o + 2) {
          this.winGame('player');
          return;
        }
      } else {
        o++;
        if (o > 3 && o >= p + 2) {
          this.winGame('opponent');
          return;
        }
      }
    }

    this.score.playerPoints = p;
    this.score.opponentPoints = o;
    this.score.isDeuce = p >= 3 && o >= 3 && this.score.advantage === null;
    this.score.serveFaultCount = 0;
    this.callbacks.onScoreUpdate({ ...this.score });
  }

  private winGame(winner: 'player' | 'opponent') {
    if (winner === 'player') {
      this.score.playerGames++;
    } else {
      this.score.opponentGames++;
    }

    this.score.playerPoints = 0;
    this.score.opponentPoints = 0;
    this.score.advantage = null;
    this.score.isDeuce = false;
    this.score.serveFaultCount = 0;

    // Switch server every game
    this.score.server = this.score.server === 'player' ? 'opponent' : 'player';

    this.callbacks.onGameWon(winner, this.score.playerGames, this.score.opponentGames);
    soundManager.playCrowdCheer(true);

    // Check set win (first to 3 games for dynamic, fast-paced play)
    if (this.score.playerGames >= 3 || this.score.opponentGames >= 3) {
      if (winner === 'player') {
        this.score.playerSets++;
      } else {
        this.score.opponentSets++;
      }

      this.callbacks.onMatchWon(winner);
      soundManager.playWhistle();
      return;
    }

    this.callbacks.onScoreUpdate({ ...this.score });
  }

  public prepareServe() {
    this.serveState = 'IDLE';
    this.ballActive = false;
    this.ballBounces = 0;
    this.currentRally = 0;
    this.callbacks.onRallyCount(0);

    if (this.score.server === 'player') {
      this.playerGroup.position.set(1.4, 0, 11.2);
      this.ballPos.set(1.7, 1.1, 10.8);
      this.callbacks.onCommentary('SEU SAQUE! MOVA O BRAÇO PARA CIMA PARA SACAR!');
    } else {
      this.opponentGroup.position.set(-1.4, 0, -11.2);
      this.ballPos.set(-1.7, 1.1, -10.8);
      this.callbacks.onCommentary('SAQUE DO ADVERSÁRIO... ATENÇÃO!');
    }

    this.ballMesh.position.copy(this.ballPos);
  }

  private getScoreAnnouncement(winner: string, reason: string): string {
    const ptLabels = ['zero', 'quinze', 'trinta', 'quarenta'];
    if (this.score.advantage) {
      return this.score.advantage === 'player' ? 'Vantagem sua!' : 'Vantagem adversário!';
    }
    if (this.score.isDeuce) {
      return 'Iguais!';
    }
    const pStr = ptLabels[Math.min(3, this.score.playerPoints)];
    const oStr = ptLabels[Math.min(3, this.score.opponentPoints)];
    return `${reason}. Placar: ${pStr} a ${oStr}`;
  }

  public resetMatch() {
    this.score = {
      playerPoints: 0,
      opponentPoints: 0,
      playerGames: 0,
      opponentGames: 0,
      playerSets: 0,
      opponentSets: 0,
      isDeuce: false,
      advantage: null,
      server: 'player',
      serveFaultCount: 0
    };
    this.prepareServe();
    this.callbacks.onScoreUpdate({ ...this.score });
  }

  // Main Render Loop
  private renderLoop = () => {
    if (this.isDisposed) return;

    const dt = Math.min(this.clock.getDelta(), 0.05);

    // 1. Smooth Player Position from Body Tracking
    this.playerGroup.position.x += (this.targetPlayerX - this.playerGroup.position.x) * (dt * 10);

    // Player running leg animation
    const speedX = Math.abs(this.targetPlayerX - this.playerGroup.position.x);
    if (speedX > 0.05) {
      const legAngle = Math.sin(this.clock.elapsedTime * 14) * 0.45;
      this.playerLegLeft.rotation.x = legAngle;
      this.playerLegRight.rotation.x = -legAngle;
    } else {
      this.playerLegLeft.rotation.x = 0;
      this.playerLegRight.rotation.x = 0;
    }

    // 2. Opponent AI update
    this.updateOpponentAI(dt);

    // 3. Ball Physics & In/Out check
    this.updateBallPhysics(dt);

    // 4. Smooth Camera Follow
    // Damps camera slightly towards ball X position for authentic broadcast experience
    const camTargetX = this.ballActive ? this.ballPos.x * 0.22 : 0;
    this.camera.position.x += (camTargetX - this.camera.position.x) * (dt * 3.5);

    this.renderer.render(this.scene, this.camera);
    this.animFrameId = requestAnimationFrame(this.renderLoop);
  };

  private onResize = () => {
    if (!this.container || !this.renderer || !this.camera) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  public dispose() {
    this.isDisposed = true;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
  }
}
