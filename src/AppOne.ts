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

	function findContour(y: number): BABYLON.Vector3[] {
		let contourPoints = [];

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
				// Get position vectors of the 3 vertices
				const v1 = new BABYLON.Vector3(positions[idx1], positions[idx1 + 1], positions[idx1 + 2]);
				const v2 = new BABYLON.Vector3(positions[idx2], positions[idx2 + 1], positions[idx2 + 2]);
				const v3 = new BABYLON.Vector3(positions[idx3], positions[idx3 + 1], positions[idx3 + 2]);

				// Calculate intersection points between the triangle and the plane
				const intersectionPoints = [];

				// Check each edge of the triangle for intersection with the plane
				// Edge 1: v1 to v2
				if ((v1.y < y && v2.y > y) || (v1.y > y && v2.y < y)) {
					const t = (y - v1.y) / (v2.y - v1.y);
					const intersection = v1.add(v2.subtract(v1).scale(t));
					intersectionPoints.push(intersection);
				}

				// Edge 2: v2 to v3
				if ((v2.y < y && v3.y > y) || (v2.y > y && v3.y < y)) {
					const t = (y - v2.y) / (v3.y - v2.y);
					const intersection = v2.add(v3.subtract(v2).scale(t));
					intersectionPoints.push(intersection);
				}

				// Edge 3: v3 to v1
				if ((v3.y < y && v1.y > y) || (v3.y > y && v1.y < y)) {
					const t = (y - v3.y) / (v1.y - v3.y);
					const intersection = v3.add(v1.subtract(v3).scale(t));
					intersectionPoints.push(intersection);
				}

				// Create a line showing the intersection if we found two points
				if (intersectionPoints.length >= 2) {
					contourPoints = [...contourPoints, ...intersectionPoints];
				}

			}
		}
		return contourPoints;
	}

	function visualiseContour(contourPoints: BABYLON.Vector3[]): BABYLON.Mesh {
		// Organize contour points into a set of connected lines
		const contourLines = [];

		// Sort points to form a continuous line
		// This is a simple approach - for complex contours you might need more sophisticated ordering
		const sortedPoints = [...contourPoints];

		// Create pairs of points to form line segments
		for (let i = 0; i < sortedPoints.length - 1; i += 2) {
			if (i + 1 < sortedPoints.length) {
				contourLines.push([sortedPoints[i], sortedPoints[i + 1]]);
			}
		}

		const contourVisualizer = BABYLON.MeshBuilder.CreateLineSystem(
			"contourLines",
			{
				lines: contourLines,
				colors: Array(contourLines.length).fill([
					new BABYLON.Color4(0, 1, 0, 1),
					new BABYLON.Color4(0, 1, 0, 1)
				])
			},
			scene
		);
		return contourVisualizer;
	}

	if (true) {
		let yObj = { y: 5 };
		let plane;
		let highlightMesh;
		let linesMesh;

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

			let contourPoints = findContour(y);

			if (linesMesh) {
				linesMesh.dispose(); // Dispose of the old lines if they exist
			}
			linesMesh = visualiseContour(contourPoints);
		});
	}

	// Multiple contour lines visualization
	if (true) {
		let config = {
			minY: -10,
			maxY: 10,
			step: 1,
			showContours: true
		};

		let contourMeshes: BABYLON.Mesh[] = [];

		// Function to update all contour lines
		function updateContours() {
			// Remove any existing contour visualizations
			contourMeshes.forEach(mesh => mesh.dispose());
			contourMeshes = [];

			if (!config.showContours) return;

			// Create contours at each step interval
			for (let y = config.minY; y <= config.maxY; y += config.step) {
				const contourPoints = findContour(y);
				const contourMesh = visualiseContour(contourPoints);
				
				// Store reference to dispose later
				contourMeshes.push(contourMesh);
			}
		}

		// Add GUI controls for the contour configuration
		const contourFolder = gui.addFolder('Multiple Contours');
		contourFolder.add(config, 'minY', -10, 0).onChange(updateContours);
		contourFolder.add(config, 'maxY', 0, 10).onChange(updateContours);
		contourFolder.add(config, 'step', 0.5, 5).step(0.5).onChange(updateContours);
		contourFolder.add(config, 'showContours').onChange(updateContours);
		contourFolder.open();

		// Initialize contours
		updateContours();
	}

	if (false) {
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
