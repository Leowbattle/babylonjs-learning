import * as BABYLON from 'babylonjs'
import PoissonDiskSampling from 'poisson-disk-sampling';
import { Delaunay } from 'd3-delaunay';
import { createNoise2D } from 'simplex-noise';
import * as dat from 'dat.gui';

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

	const gui = new dat.GUI();

	const camera = new BABYLON.ArcRotateCamera("camera", Math.PI / 2, Math.PI / 4, 50, BABYLON.Vector3.Zero(), scene);
	camera.attachControl(canvas, true);

	const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
	light.intensity = 0.7;

	const directionalLight = new BABYLON.DirectionalLight("dir01", new BABYLON.Vector3(0.2, -1, 0.5), scene);
	directionalLight.position = new BABYLON.Vector3(0, 10, 0);

	var p = new PoissonDiskSampling({
		shape: [100, 100],
		minDistance: 2,
		maxDistance: 10,
		tries: 10
	});
	var points = p.fill();

	// Offset all points by 50, 50
	points = points.map(p => [p[0] - 50, p[1] - 50]);

	// Convert back to 2D points for Delaunay triangulation
	// (Delaunay works in 2D space, but we'll use the 3D points for the mesh)
	const points2D = points.slice();

	const triangulation = Delaunay.from(points);
	// Extract the triangles from Delaunay triangulation
	const triangles = triangulation.triangles;
	const coords = triangulation.points;

	// Create vertex data for the mesh
	const vertexData = new BABYLON.VertexData();
	const positions: number[] = [];
	const indices: number[] = [];
	const normals: number[] = [];

	const noise2D = createNoise2D();

	// Populate positions (3D points) from the 2D triangulation
	for (let i = 0; i < coords.length; i += 2) {
		// Sample the y coord from 2d simplex noise
		const y = noise2D(coords[i] / 50, coords[i + 1] / 50) * 10; // Scale the noise for better height variation
		positions.push(coords[i], y, coords[i + 1]);
	}

	// Populate indices with reversed winding order
	for (let i = 0; i < triangles.length; i += 3) {
		// Push vertices in reverse order (2, 1, 0 instead of 0, 1, 2)
		indices.push(
			triangles[i + 2],
			triangles[i + 1],
			triangles[i]
		);
	}

	// Compute normals
	BABYLON.VertexData.ComputeNormals(positions, indices, normals);

	// Apply to vertex data
	vertexData.positions = positions;
	vertexData.indices = indices;
	vertexData.normals = normals;

	// Create mesh
	const groundMesh = new BABYLON.Mesh("ground", scene);
	vertexData.applyToMesh(groundMesh);

	// Create material
	const groundMaterial = new BABYLON.StandardMaterial("groundMaterial", scene);
	groundMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
	groundMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
	groundMesh.material = groundMaterial;

	if (true) {
		let yObj = { y: 5 };
		let plane;
		let highlightMesh;

		gui.add(yObj, 'y', -10, 10).name('Highlight Y').onChange((y) => {
			// Create a horizontal plane at y=5
			if (plane) {
				plane.dispose(); // Dispose of the old plane if it exists
			}
			plane = BABYLON.MeshBuilder.CreatePlane("plane", { size: 100 }, scene);
			plane.position.y = y;
			plane.rotation.x = Math.PI / 2; // Rotate to horizontal position

			// Create a semi-transparent material for the plane
			const planeMaterial = new BABYLON.StandardMaterial("planeMaterial", scene);
			planeMaterial.diffuseColor = new BABYLON.Color3(0, 0.8, 1);
			planeMaterial.alpha = 0.3; // Transparency
			planeMaterial.backFaceCulling = false; // Show both sides

			// Apply material to plane
			plane.material = planeMaterial;

			// Create a material for highlighting triangles that cross y=5
			const highlightMaterial = new BABYLON.StandardMaterial("highlightMaterial", scene);
			highlightMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0); // Red color
			highlightMaterial.alpha = 0.7; // Semi-transparent

			// Create a new mesh to hold only the triangles that cross y=5
			if (highlightMesh) {
				highlightMesh.dispose(); // Dispose of the old highlight mesh if it exists
			}
			highlightMesh = new BABYLON.Mesh("highlight", scene);
			const highlightData = new BABYLON.VertexData();
			const highlightPositions: number[] = [];
			const highlightIndices: number[] = [];
			const highlightNormals: number[] = [];

			// Check each triangle
			for (let i = 0; i < indices.length; i += 3) {
				// Get indices of the three vertices of this triangle
				const idx1 = indices[i] * 3;
				const idx2 = indices[i + 1] * 3;
				const idx3 = indices[i + 2] * 3;

				// Get y values of each vertex
				const y1 = positions[idx1 + 1];
				const y2 = positions[idx2 + 1];
				const y3 = positions[idx3 + 1];

				// Find min and max y values
				const minY = Math.min(y1, y2, y3);
				const maxY = Math.max(y1, y2, y3);

				// Check if triangle crosses y
				if (minY < y && maxY > y) {
					// Add this triangle to the highlight mesh
					const baseIdx = highlightPositions.length / 3;

					// Add the three vertices
					highlightPositions.push(
						positions[idx1], positions[idx1 + 1], positions[idx1 + 2],
						positions[idx2], positions[idx2 + 1], positions[idx2 + 2],
						positions[idx3], positions[idx3 + 1], positions[idx3 + 2]
					);

					// Add indices for this triangle
					highlightIndices.push(baseIdx, baseIdx + 1, baseIdx + 2);

					// Copy normals
					highlightNormals.push(
						normals[idx1], normals[idx1 + 1], normals[idx1 + 2],
						normals[idx2], normals[idx2 + 1], normals[idx2 + 2],
						normals[idx3], normals[idx3 + 1], normals[idx3 + 2]
					);
				}
			}

			// Apply the vertex data to the highlight mesh
			highlightData.positions = highlightPositions;
			highlightData.indices = highlightIndices;
			highlightData.normals = highlightNormals;
			highlightData.applyToMesh(highlightMesh);

			// Apply the highlight material
			highlightMesh.material = highlightMaterial;
			highlightMesh.position.y += 0.05; // Slight offset to prevent z-fighting
		});
	}

	if (true) {
		// Enable wireframe visualization
		const wireframeMaterial = new BABYLON.StandardMaterial("wireframeMaterial", scene);
		wireframeMaterial.wireframe = true;
		wireframeMaterial.emissiveColor = new BABYLON.Color3(0, 0.6, 0.8);

		// Create a wireframe instance of the mesh
		const wireframeMesh = groundMesh.clone("wireframe");
		wireframeMesh.material = wireframeMaterial;
		wireframeMesh.position.y += 0.01; // Slight offset to prevent z-fighting
	}
	if (false) {
		// Visualize normals
		const normalLines = [];
		const normalLength = 2; // Length of normal visualization lines

		for (let i = 0; i < positions.length; i += 3) {
			const vertexPos = new BABYLON.Vector3(positions[i], positions[i + 1], positions[i + 2]);
			const normalVec = new BABYLON.Vector3(normals[i], normals[i + 1], normals[i + 2]);

			// Start point of the line is the vertex position
			normalLines.push([
				vertexPos,
				// End point is vertex position + scaled normal vector
				vertexPos.add(normalVec.scale(normalLength))
			]);
		}

		// Create lines system for visualizing normals
		const normalVisualizer = BABYLON.MeshBuilder.CreateLineSystem(
			"normalVisualizer",
			{
				lines: normalLines,
				colors: Array(normalLines.length).fill([new BABYLON.Color4(1, 0, 0, 1), new BABYLON.Color4(1, 1, 0, 1)])
			},
			scene
		);
	}

	return scene;
};
