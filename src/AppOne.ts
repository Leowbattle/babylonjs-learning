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

	const box = BABYLON.MeshBuilder.CreateBox("box", { width: 1, height: 2, depth: 1 }, scene);
	box.position.y = 1;

	const boxMaterial = new BABYLON.StandardMaterial("boxMaterial", scene);
	// boxMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0);
	boxMaterial.diffuseTexture = new BABYLON.Texture("https://www.babylonjs-playground.com/textures/wood.jpg", scene);
	boxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
	box.material = boxMaterial;

	box.setPivotPoint(new BABYLON.Vector3(-0.5, -1, 0));

	BABYLON.Animation.CreateAndStartAnimation("rot", box, "rotation.z", 60, 15, 0, Math.PI/2, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT, new BABYLON.CubicEase(), () => {
		box.setPivotPoint(new BABYLON.Vector3(0, 0, 0));
		box.position.y = 0.5;
		box.position.x -= 1.5;

		// box.setPivotPoint(new BABYLON.Vector3(-0.5, 1, 0), true);
	});

	// Visualise the pivot point
	const pivot1 = BABYLON.MeshBuilder.CreateSphere("pivot1", { diameter: 0.2 }, scene);
	pivot1.parent = box;
	pivot1.position = new BABYLON.Vector3(-0.5, -1, 0);
	pivot1.material = new BABYLON.StandardMaterial("pivotMaterial", scene);
	pivot1.material.diffuseColor = new BABYLON.Color3(1, 0, 0);

	// Pivot 2, point (0.5, -1, 0)
	const pivot2 = BABYLON.MeshBuilder.CreateSphere("pivot2", { diameter: 0.2 }, scene);
	pivot2.parent = box;
	pivot2.position = new BABYLON.Vector3(-0.5, 1, 0);
	pivot2.material = new BABYLON.StandardMaterial("pivotMaterial", scene);
	pivot2.material.diffuseColor = new BABYLON.Color3(0, 1, 0);


	return scene;
};
