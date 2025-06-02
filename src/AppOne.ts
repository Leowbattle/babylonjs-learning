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

	const camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(10, 5, -10), scene);
	camera.rotationQuaternion = new BABYLON.Quaternion(0, 0, 0, 1);

	const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
	light.intensity = 0.7;

	const directionalLight = new BABYLON.DirectionalLight("dir01", new BABYLON.Vector3(0.2, -1, 0.5), scene);
	directionalLight.position = new BABYLON.Vector3(0, 10, 0);

	const meshes = [];
	// Array of available shape creation functions
	const shapeCreators = [
		() => BABYLON.MeshBuilder.CreateBox("box", { size: 1 + Math.random() * 0.5 }, scene),
		() => BABYLON.MeshBuilder.CreateSphere("sphere", { diameter: 1 + Math.random() * 0.5 }, scene),
		() => BABYLON.MeshBuilder.CreateCylinder("cylinder", { height: 1 + Math.random() * 0.5, diameter: 1 + Math.random() * 0.5 }, scene),
		() => BABYLON.MeshBuilder.CreateTorus("torus", { diameter: 1 + Math.random() * 0.5, thickness: 0.3 + Math.random() * 0.2 }, scene),
		() => BABYLON.MeshBuilder.CreateIcoSphere("icosphere", { radius: 0.5 + Math.random() * 0.5, subdivisions: 2 }, scene)
	];

	// Create 5 random meshes
	for (let i = 0; i < 5; i++) {
		// Choose a random shape creator
		const shapeIndex = Math.floor(Math.random() * shapeCreators.length);
		const mesh = shapeCreators[shapeIndex]();
		
		// Set random position
		mesh.position = new BABYLON.Vector3(
			(Math.random() - 0.5) * 15,  // x: -2.5 to 2.5
			1 + Math.random() * 4,      // y: 1 to 3
			(Math.random() - 0.5) * 15   // z: -2.5 to 2.5
		);
		
		// Set random color
		const material = new BABYLON.StandardMaterial(`material${i}`, scene);
		material.diffuseColor = new BABYLON.Color3(
			Math.random(),
			Math.random(),
			Math.random()
		);
		mesh.material = material;
		
		// Add to meshes array
		meshes.push(mesh);
	}

	let animating = false;

	let pos1 = new BABYLON.Vector3();
	let pos2 = new BABYLON.Vector3();
	let rot1 = new BABYLON.Quaternion();
	let rot2 = new BABYLON.Quaternion();

	let animTime = 0;
	let animDuration = 1000; // Animation duration in milliseconds

	var pointerDown = function (mesh: BABYLON.AbstractMesh) {
		console.log("Pointer down on mesh:", mesh.name);

		if (animating) return;
		animating = true;

		pos1.copyFrom(camera.position);
		rot1.copyFrom(camera.rotationQuaternion || BABYLON.Quaternion.Identity());

		let matrix = BABYLON.Matrix.LookAtLH(
			camera.position,
			mesh.position,
			BABYLON.Vector3.Up()
		);
		matrix.decompose(undefined, rot2, pos2);

		rot2.invertInPlace();

		console.log("Camera rotation before animation:", camera.rotationQuaternion);
    }

	scene.onPointerObservable.add((pointerInfo) => {      		
        switch (pointerInfo.type) {
			case BABYLON.PointerEventTypes.POINTERDOWN:
				if(pointerInfo.pickInfo.hit) {
                    pointerDown(pointerInfo.pickInfo.pickedMesh);
                }
				break;
        }
    });

	scene.onBeforeRenderObservable.add(() => {
		if (animating) {
			animTime += scene.getEngine().getDeltaTime();
			if (animTime >= animDuration) {
				animating = false;
				animTime = 0;
			} else {
				const ease = new BABYLON.CubicEase();
				ease.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);
				const t = ease.ease(animTime / animDuration);
				
				BABYLON.Quaternion.SlerpToRef(rot1, rot2, t, camera.rotationQuaternion);
			}
		}
	});

	return scene;
};
