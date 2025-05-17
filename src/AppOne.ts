import * as BABYLON from 'babylonjs'

export class AppOne {
	engine: BABYLON.Engine;
	scene: BABYLON.Scene;

	constructor(readonly canvas: HTMLCanvasElement) {
		this.engine = new BABYLON.Engine(canvas)
		window.addEventListener('resize', () => {
			this.engine.resize();
		});
		this.scene = createScene(this.engine, this.canvas)

	}

	debug(debugOn: boolean = true) {
		if (debugOn) {
			this.scene.debugLayer.show({ overlay: true });
		} else {
			this.scene.debugLayer.hide();
		}
	}

	run() {
		this.debug(true);
		this.engine.runRenderLoop(() => {
			this.scene.render();
		});
	}
}

const createScene = function (engine: BABYLON.Engine, canvas: HTMLCanvasElement) {
	const scene = new BABYLON.Scene(engine);

	const camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, 1.1104, 20, new BABYLON.Vector3(0, 0, 0), scene);
	camera.attachControl(canvas, true);
	camera.inputs.removeByType("ArcRotateCameraKeyboardMoveInput");

	const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
	light.intensity = 0.7;

	const directionalLight = new BABYLON.DirectionalLight("dir01", new BABYLON.Vector3(0.2, -1, 0.5), scene);
	directionalLight.position = new BABYLON.Vector3(0, 10, 0);

	const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 6, height: 6 }, scene);
	const groundMaterial = new BABYLON.StandardMaterial("groundMaterial", scene);
	groundMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.8);
	ground.material = groundMaterial;

	// Add to the scene an axis visualiser
	const axis = new BABYLON.AxesViewer(scene);

	const player = new BABYLON.Mesh("player", scene);

	const box = BABYLON.MeshBuilder.CreateBox("box", { width: 1, height: 2, depth: 1 }, scene);
	box.position.y = 1;
	box.parent = player;

	const boxMaterial = new BABYLON.StandardMaterial("boxMaterial", scene);
	// boxMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0);
	boxMaterial.diffuseTexture = new BABYLON.Texture("https://www.babylonjs-playground.com/textures/wood.jpg", scene);
	boxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
	box.material = boxMaterial;

	const pivotPos = [
		new BABYLON.Vector3(-0.5, 0, 0),
		new BABYLON.Vector3(0.5, 0, 0),
		new BABYLON.Vector3(0, 0, -0.5),
		new BABYLON.Vector3(0, 0, 0.5),
	];

	let pivots = [];
	for (let i = 0; i < pivotPos.length; i++) {
		const pivot = BABYLON.MeshBuilder.CreateSphere("pivot" + i, { diameter: 0.2 }, scene);
		pivot.position = pivotPos[i];
		pivot.parent = player;
		pivots.push(pivot);
	}

	function rotBox(i: number, onFinish?: () => void) {
		box.parent = pivots[i];

		BABYLON.Animation.CreateAndStartAnimation("rotBox", pivots[i], "rotation.z", 60, 15, 0, Math.PI / 2, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT, undefined, onFinish);
	}

	rotBox(0, () => rotBox(1));

	return scene;
};
