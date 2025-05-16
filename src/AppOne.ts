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

function playFallAnimation(mesh: BABYLON.Mesh, scene: BABYLON.Scene, onFinish?: () => void) {
	// Fade out animation
	BABYLON.Animation.CreateAndStartAnimation(
		"fade",
		mesh,
		"visibility",
		60,
		30,
		1,
		0,
		BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
		new BABYLON.CubicEase(),
		onFinish
	);

	// Fall animation
	BABYLON.Animation.CreateAndStartAnimation(
		"fall",
		mesh,
		"position.y",
		60,
		30,
		mesh.position.y,
		-10,
		BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
		new BABYLON.CubicEase()
	);

	// Rotation animation
	BABYLON.Animation.CreateAndStartAnimation(
		"rotate",
		mesh,
		"rotation.z",
		60,
		30,
		mesh.rotation.y,
		mesh.rotation.y + Math.PI * 2,
		BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
		new BABYLON.CubicEase()
	);
}

interface Level {
	map: number[][],
	playerStart: { x: number, y: number },
}

const createScene = function (engine: BABYLON.Engine, canvas: HTMLCanvasElement) {
	const scene = new BABYLON.Scene(engine);

	const camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, 1.1104, 20, new BABYLON.Vector3(0, 0, 0), scene);
	//camera.attachControl(canvas, true);
	camera.inputs.removeByType("ArcRotateCameraKeyboardMoveInput");

	const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
	light.intensity = 0.7;

	const directionalLight = new BABYLON.DirectionalLight("dir01", new BABYLON.Vector3(0.2, -1, 0.5), scene);
	directionalLight.position = new BABYLON.Vector3(0, 10, 0);

	const map = [
		[1,1,1,1,1,1,1,2,1],
	];
	const tiles = [];
	const tilesParent = new BABYLON.Mesh("tiles", scene);

	const tileMaterial = new BABYLON.StandardMaterial("tileMaterial", scene);
	tileMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.4, 0.4);
	tileMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);

	const winTileMaterial = new BABYLON.StandardMaterial("winTileMaterial", scene);
	winTileMaterial.diffuseColor = new BABYLON.Color3(0.8, 0.4, 0.4);
	winTileMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);

	for (let i = 0; i < map.length; i++) {
		tiles[i] = [];
		for (let j = 0; j < map[i].length; j++) {
			if (map[i][j] !== 0) {
				const tile = BABYLON.MeshBuilder.CreateBox("tile_" + i + "_" + j, { width: 1, height: 0.1, depth: 1 }, scene);
				tile.position = new BABYLON.Vector3(j, -0.05, i);
				tile.material = map[i][j] === 2 ? winTileMaterial : tileMaterial;
				tile.type = map[i][j];

				tiles[i][j] = tile;

				tile.parent = tilesParent;
			}
		}
	}

	// Center the camera on the tiles
	camera.position.x = map[0].length / 2 - 0.5;
	camera.setTarget(new BABYLON.Vector3(map[0].length / 2 - 0.5, 0, map.length / 2 - 0.5));

	const box = BABYLON.MeshBuilder.CreateBox("box", { size: 1 }, scene);
	box.position.y = 0.5;

	const boxMaterial = new BABYLON.StandardMaterial("boxMaterial", scene);
	boxMaterial.diffuseColor = new BABYLON.Color3.FromHexString("#FFFD00");
	boxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
	box.material = boxMaterial;

	let boxAnimating = false;

	// Set up keyboard events
	const moveBox = (offsetX: number, offsetZ: number) => {
		if (boxAnimating) return; // Prevent multiple animations at once
		boxAnimating = true;

		const currentTileX = Math.floor(box.position.x);
		const currentTileZ = Math.floor(box.position.z);

		// Calculate the new tile position
		const newTileX = currentTileX + offsetX;
		const newTileZ = currentTileZ + offsetZ;

		let boxFall = false;

		// Check if the new position is within bounds and has a tile
		if (newTileX < 0 || newTileX >= map[0].length || newTileZ < 0 || newTileZ >= map.length || map[newTileZ][newTileX] == 0) {
			boxFall = true;
		}

		// Remove the tile from the current position
		if (map[currentTileZ][currentTileX] === 1) {
			map[currentTileZ][currentTileX] = 0;

			const tile = tiles[currentTileZ][currentTileX];

			// Call the function on the tile
			playFallAnimation(tile, scene, () => {
				tile.dispose(); // Remove the mesh after the animation
			});
			tiles[currentTileZ][currentTileX] = null; // Clear the reference in the tiles array
		}

		const targetPosition = new BABYLON.Vector3(
			newTileX,
			box.position.y,
			newTileZ
		);

		// Create animation
		BABYLON.Animation.CreateAndStartAnimation(
			"boxMove",
			box,
			"position",
			60,
			5,
			box.position,
			targetPosition,
			BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
			new BABYLON.CubicEase(),
			() => {
				boxAnimating = false; // Reset the flag when animation is done

				if (boxFall) {
					playFallAnimation(box, scene);
				}

				// Check if the box is on the winning tile
				if (map[newTileZ][newTileX] === 2) {
					// Check if any non winner tiles are still present
					let allTilesGone = true;
					for (let i = 0; i < map.length; i++) {
						for (let j = 0; j < map[i].length; j++) {
							if (map[i][j] === 1) {
								allTilesGone = false;
								break;
							}
						}
					}

					if (!allTilesGone) {
						playFallAnimation(box, scene);
					}
				}
			}
		);
	};

	// WASD controls
	const keyDownMap: { [key: string]: boolean } = {};
	scene.onKeyboardObservable.add((kbInfo) => {
		switch (kbInfo.type) {
			case BABYLON.KeyboardEventTypes.KEYDOWN:
				keyDownMap[kbInfo.event.key] = true;

				if (kbInfo.event.key === "w" || kbInfo.event.key === "W") {
					moveBox(0, 1);
				} else if (kbInfo.event.key === "a" || kbInfo.event.key === "A") {
					moveBox(-1, 0);
				} else if (kbInfo.event.key === "s" || kbInfo.event.key === "S") {
					moveBox(0, -1);
				} else if (kbInfo.event.key === "d" || kbInfo.event.key === "D") {
					moveBox(1, 0);
				}
				break;
			case BABYLON.KeyboardEventTypes.KEYUP:
				keyDownMap[kbInfo.event.key] = false;
				break;
		}
	});

	return scene;
};
