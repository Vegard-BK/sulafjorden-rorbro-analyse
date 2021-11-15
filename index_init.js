import * as THREE from 'three';

import Stats from './node_modules/three/examples/jsm/libs/stats.module.js';
import { GUI } from './node_modules/three/examples/jsm/libs/dat.gui.module.js';
import { OrbitControls } from './node_modules/three/examples/jsm/controls/OrbitControls.js';
import { Water } from './node_modules/three/examples/jsm/objects/Water.js';
import { Sky } from './node_modules/three/examples/jsm/objects/Sky.js';
import { GLTFLoader } from './node_modules/three/examples/jsm/loaders/GLTFLoader.js';

let container, stats;
let camera, scene, renderer;
let controls, water, sun, mesh, model,center,rotor,centerrotor,bridge,centerbridge;
let pivotbridge,clock
  	

// Caluclate rotation and translation of bridge
//let rotation_y = Math.PI -  2*0.68703019793236;	
//let position_z=+1322  //Nord
//let position_x=-1458   //Ost

let rotation_y = 0.883766129;  //0.883766129	
let position_z=+1321.66  //Nord
let position_x=-1458.41   //Ost


let gui, mixer, actions, activeAction, previousAction;
let panelSettings

 

init();
animate();

function init() {

	clock = new THREE.Clock();
	container = document.getElementById( 'container' );

	//

	renderer = new THREE.WebGLRenderer();
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	container.appendChild( renderer.domElement );

	//

	scene = new THREE.Scene();

	camera = new THREE.PerspectiveCamera( 55, window.innerWidth / window.innerHeight, 1, 20000 );
	camera.position.set( 100, 30, 0 );

	//

	sun = new THREE.Vector3();

	// Water

	const waterGeometry = new THREE.PlaneGeometry( 10000, 10000 );

	water = new Water(
		waterGeometry,
		{
			textureWidth: 512,
			textureHeight: 512,
			waterNormals: new THREE.TextureLoader().load( 'accessories/photos/waternormals.jpg', function ( texture ) {

				texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

			} ),
			alpha: 1.0,
			sunDirection: new THREE.Vector3(),
			sunColor: 0xffffff,
			waterColor: 0x001e0f,
			distortionScale: 3.7,
			fog: scene.fog !== undefined
		}
	);

	water.rotation.x = - Math.PI / 2;
	scene.add( water );


	// lights

	scene.add( new THREE.AmbientLight( 0x666666 ) );

	const light = new THREE.DirectionalLight( 0xdfebff, 0.1 );
	light.position.set( 50, 200, 100 );
	light.position.multiplyScalar( 1.3 );

	light.castShadow = true;

	light.shadow.mapSize.width = 1024;
	light.shadow.mapSize.height = 1024;

	const d = 300;

	light.shadow.camera.left = - d;
	light.shadow.camera.right = d;
	light.shadow.camera.top = d;
	light.shadow.camera.bottom = - d;

	light.shadow.camera.far = 1000;

	scene.add( light );

	const loader_t = new THREE.TextureLoader();
	const groundTexture = loader_t.load( 'accessories/photos/Terrain-hillshade.png' );
	groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
	groundTexture.repeat.set( 1, 1 );
	groundTexture.anisotropy = 16;
	groundTexture.encoding = THREE.sRGBEncoding;

	const groundMaterial = new THREE.MeshLambertMaterial( { map: groundTexture } );


	// Create terrain model


	// Get terrain data from text file

	let rows = geo_info[0]-1
	let cols = geo_info[1]-1
	let height = geo_info[2]
	let width = geo_info[3]
	
	const terrainGeometry = new THREE.PlaneGeometry( width,height,cols, rows );
	const vertices = terrainGeometry.attributes.position.array
	const numVertices=vertices.length/3

	//

	for (let i = 0; i < numVertices; i++) {
		vertices[ 3*i + 2 ]=elevation_data[i];   
	}	


	let mesh = new THREE.Mesh( terrainGeometry , groundMaterial );
	mesh.rotation.x = - Math.PI / 2;
	mesh.receiveShadow = true;

	scene.add( mesh );



	// Skybox

	const sky = new Sky();
	sky.scale.setScalar( 10000 );
	scene.add( sky );

	const skyUniforms = sky.material.uniforms;

	skyUniforms[ 'turbidity' ].value = 10;
	skyUniforms[ 'rayleigh' ].value = 2;
	skyUniforms[ 'mieCoefficient' ].value = 0.005;
	skyUniforms[ 'mieDirectionalG' ].value = 0.8;

	let parameters = {
		inclination: 0.49,
		azimuth: 0.205,
		rps: 1.0,
	};

	const pmremGenerator = new THREE.PMREMGenerator( renderer );

	function updateSun() {

		const theta = Math.PI * ( parameters.inclination - 0.5 );
		const phi = 2 * Math.PI * ( parameters.azimuth - 0.5 );

		sun.x = Math.cos( phi );
		sun.y = Math.sin( phi ) * Math.sin( theta );
		sun.z = Math.sin( phi ) * Math.cos( theta );

		sky.material.uniforms[ 'sunPosition' ].value.copy( sun );
		water.material.uniforms[ 'sunDirection' ].value.copy( sun ).normalize();

		scene.environment = pmremGenerator.fromScene( sky ).texture;

	}

	updateSun();

	//

	const loader = new GLTFLoader();
	

	// Load bridge
	pivotbridge = new THREE.Object3D();
	loader.load( 'models/gltf/structure_sf.glb', function ( gltf ) {
	bridge = gltf.scene	
	//pivotbridge.add( bridge);
	bridge.rotation.y = rotation_y;	
	bridge.position.z+=position_z  //Nord
	bridge.position.x+=position_x  //Ost
	scene.add(bridge)

	function createGUI( model, animations ) {
		panelSettings = {'modify time scale': 1.0};
	

		const states = [];
		gui = new GUI();
		mixer = new THREE.AnimationMixer( model );
		actions = {};

	
		for ( let i = 0; i < animations.length; i ++ ) {
		
		

			const clip = animations[ i ];
			states.push(clip.name);
			const action = mixer.clipAction( clip );
			actions[ clip.name ] = action;
			if (i==0) {
			panelSettings[clip.name] = 1.0;
			} else {
			panelSettings[clip.name] = 0.0;
			}
			setWeight( action, panelSettings[clip.name] )
			action.play();
		
		}
	
		const animationFolder =gui.addFolder('Animation states')
		for ( let i = 0; i < animations.length; i ++ ) {
		
			if (i!=0) {	
			animationFolder.add( panelSettings, states[i], 0.0, 100.0, 1.0 ).listen().onChange( function ( weight ) { 
				setWeight( actions[states[i]], weight );	
			
			});
			}
		}
		//animationFolder.open();



		const api = { state: states [0] };

		// states

		//const statesFolder = gui.addFolder( 'States' );
		//const clipCtrl = statesFolder.add( api, 'state' ).options( states );
		//clipCtrl.onChange( function () {
		//	fadeToAction( api.state, 0.5 );
		//
		//} );

		//statesFolder.open();

		const speedFolder = gui.addFolder( 'General Speed' );
		speedFolder.add( panelSettings, 'modify time scale', 0.0, 5.0, 0.02 ).onChange( modifyTimeScale );
		//speedFolder.open()

		//activeAction = actions[ states [0] ];
		//activeAction.play();	


		const folderSky = gui.addFolder( 'Sky' );
		folderSky.add( parameters, 'inclination', 0, 0.5, 0.0001 ).onChange( updateSun );
		folderSky.add( parameters, 'azimuth', 0, 1, 0.0001 ).onChange( updateSun );
		//folderSky.open();

		const waterUniforms = water.material.uniforms;

		const folderWater = gui.addFolder( 'Water' );
		folderWater.add( waterUniforms.distortionScale, 'value', 0, 8, 0.1 ).name( 'distortionScale' );
		folderWater.add( waterUniforms.size, 'value', 0.1, 10, 0.1 ).name( 'size' );
		folderWater.add( waterUniforms.alpha, 'value', 0.5, 1, .001 ).name( 'alpha' );
		//folderWater.open();

	}


	createGUI( bridge, gltf.animations );
	


	}, undefined, function ( error ) {

		console.error( error );
	} );


	//

	controls = new OrbitControls( camera, renderer.domElement );
	controls.maxPolarAngle = Math.PI * 0.495*2;
	controls.target.set( 0, 10, 0 );
	controls.minDistance = 20.0;
	controls.maxDistance = 5000.0;
	controls.update();

	//

	stats = new Stats();
	container.appendChild( stats.dom );

	// GUI

	//const gui = new GUI();

	//const folderSky = gui.addFolder( 'Sky' );
	//folderSky.add( parameters, 'inclination', 0, 0.5, 0.0001 ).onChange( updateSun );
	//folderSky.add( parameters, 'azimuth', 0, 1, 0.0001 ).onChange( updateSun );
	//folderSky.open();

	//const waterUniforms = water.material.uniforms;

	//const folderWater = gui.addFolder( 'Water' );
	//folderWater.add( waterUniforms.distortionScale, 'value', 0, 8, 0.1 ).name( 'distortionScale' );
	//folderWater.add( waterUniforms.size, 'value', 0.1, 10, 0.1 ).name( 'size' );
	//folderWater.add( waterUniforms.alpha, 'value', 0.5, 1, .001 ).name( 'alpha' );
	//folderWater.open();


	window.addEventListener( 'resize', onWindowResize );

}




function fadeToAction( name, duration ) {

	previousAction = activeAction;
	activeAction = actions[ name ];

	if ( previousAction !== activeAction ) {
		previousAction.fadeOut( duration );

	}

	activeAction
		.reset()
		.setEffectiveTimeScale( 1 )
		.setEffectiveWeight( 1 )
		.fadeIn( duration )
		.play();

}

function activateAllActions() {

	
	setWeight( idleAction, settings[ 'modify idle weight' ] );
	setWeight( walkAction, settings[ 'modify walk weight' ] );
	setWeight( runAction, settings[ 'modify run weight' ] );

	actions.forEach( function ( action ) {

		action.play();

	} );

}



function setWeight( action, weight ) {
	action.enabled = true;
	action.setEffectiveTimeScale( 1 );
	action.setEffectiveWeight( weight );

}


function modifyTimeScale( speed ) {
	mixer.timeScale = speed;
}




function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );

}

function animate() {


	const dt = clock.getDelta();

	if ( mixer ) mixer.update( dt );

	requestAnimationFrame( animate );
	render();

	stats.update()
	

}

function render() {

	water.material.uniforms[ 'time' ].value += 1.0 / 60.0;
	water.material.transparent = true
	//water.material.opacity=0.25

	renderer.render( scene, camera );

}


      


