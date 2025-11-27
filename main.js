import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RapierPhysics } from 'three/addons/physics/RapierPhysics.js';
import { RapierHelper } from 'three/addons/helpers/RapierHelper.js';

const scene = new THREE.Scene();
const canvas = document.getElementById("experience-canvas")
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight,
};

const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setSize( sizes.width, sizes.height );
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.75;

let intersectObject = "";
const intersectObjects = [];
const intersectObjectsNames = [
    "brickWhite",
    "brickRed"
];

let car, chassis, wheels, movement, vehicleController;

let physics = await RapierPhysics();

let physicsHelper = new RapierHelper( physics.World );
scene.add( physicsHelper );
physics.addScene( scene );

//gltf

const loader = new GLTFLoader();
const loaderCar = new GLTFLoader();

loader.load( 
    './car_scene.glb', 
    function ( glb ) {
        glb.scene.traverse((child) => {
            if (intersectObjectsNames.includes(child.name)) {
                intersectObjects.push(child);
            }
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
            if (child.name === "Plane"){
                child.userData.physics = { mass: 0 };    
            }
        });
        scene.add( glb.scene );
    }, 
    undefined, 
    function ( error ) {
        console.error( error );
    } 
);

//physics

movement = {
    forward: 0,
    right: 0,
    brake: 0,
    reset: false,
    accelerateForce: { value: 0, min: - 30, max: 30, step: 1 },
    brakeForce: { value: 0, min: 0, max: 1, step: 0.05 }
};

wheels = [];

loaderCar.load( 
    './car.glb', 
    function ( glb ) {
        glb.scene.traverse((child) => {
            if (intersectObjectsNames.includes(child.name)) {
                intersectObjects.push(child);
            }
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
            if (child.name === "car"){
                car = child;
                physics.addMesh( child, 10, 0.8 );
                chassis = child.userData.physics.body;
                vehicleController = physics.world.createVehicleController( chassis );
            }
            if (child.name === "Cylinder"){
                vehicleController.addWheel(
                    child.position,
                    { x: 0.0, y: - 1.0, z: 0.0 },
                    { x: - 1.0, y: 0.0, z: 0.0 },
                    0.8,
                    0.4
                );
                vehicleController.setWheelSteering( 0, Math.PI / 4 );
                vehicleController.setWheelSteering( 1, Math.PI / 4 );
                vehicleController.setWheelSuspensionStiffness( 0, 24.0 );
                vehicleController.setWheelFrictionSlip( 0, 1000.0 );
                vehicleController.setWheelSteering( 0, child.position.z < 0 );
                wheels.push(child);
            }
            if (child.name === "Cylinder.001"){
                vehicleController.addWheel(
                    child.position,
                    { x: 0.0, y: - 1.0, z: 0.0 },
                    { x: - 1.0, y: 0.0, z: 0.0 },
                    0.8,
                    0.4
                );
                vehicleController.setWheelSteering( 0, Math.PI / 4 );
                vehicleController.setWheelSteering( 1, Math.PI / 4 );
                vehicleController.setWheelSuspensionStiffness( 1, 24.0 );
                vehicleController.setWheelFrictionSlip( 1, 1000.0 );
                vehicleController.setWheelSteering( 1, child.position.z < 0 );               
                wheels.push(child);
            }
            if (child.name === "Cylinder.002"){
                vehicleController.addWheel(
                    child.position,
                    { x: 0.0, y: - 1.0, z: 0.0 },
                    { x: - 1.0, y: 0.0, z: 0.0 },
                    0.8,
                    0.62
                );
                vehicleController.setWheelSteering( 0, Math.PI / 4 );
                vehicleController.setWheelSteering( 1, Math.PI / 4 );
                vehicleController.setWheelSuspensionStiffness( 1, 24.0 );
                vehicleController.setWheelFrictionSlip( 2, 1000.0 );
                vehicleController.setWheelSteering( 2, child.position.z < 0 );
                wheels.push(child);
            }
            if (child.name === "Cylinder.003"){
                vehicleController.addWheel(
                    child.position,
                    { x: 0.0, y: - 1.0, z: 0.0 },
                    { x: - 1.0, y: 0.0, z: 0.0 },
                    0.8,
                    0.62
                );
                vehicleController.setWheelSteering( 0, Math.PI / 4 );
                vehicleController.setWheelSteering( 1, Math.PI / 4 );
                vehicleController.setWheelSuspensionStiffness( 3, 24.0 );
                vehicleController.setWheelFrictionSlip( 3, 1000.0 );
                vehicleController.setWheelSteering( 3, child.position.z < 0 );
                wheels.push(child);
            }
        });
        scene.add( glb.scene );
    }, 
    undefined, 
    function ( error ) {
        console.error( error );
    } 
);

function updateWheels() {

    if ( vehicleController === undefined ) return;

    const wheelSteeringQuat = new THREE.Quaternion();
    const wheelRotationQuat = new THREE.Quaternion();
    const up = new THREE.Vector3( 0, 1, 0 );

    //const chassisPosition = chassis.translation();

    wheels.forEach( ( wheel, index ) => {

        const wheelAxleCs = vehicleController.wheelAxleCs( index );
        const connection = vehicleController.wheelChassisConnectionPointCs( index ).y || 0;
        const suspension = vehicleController.wheelSuspensionLength( index ) || 0;
        const steering = vehicleController.wheelSteering( index ) || 0;
        const rotationRad = vehicleController.wheelRotation( index ) || 0;

        wheel.position.y = connection - suspension;

        wheelSteeringQuat.setFromAxisAngle( up, steering );
        wheelRotationQuat.setFromAxisAngle( wheelAxleCs, rotationRad );

        wheel.quaternion.multiplyQuaternions( wheelSteeringQuat, wheelRotationQuat );

    } );

}

function updateCarControl() {

    if ( movement.reset ) {

        chassis.setTranslation( new physics.RAPIER.Vector3( 0, 1, 0 ), true );
        chassis.setRotation( new physics.RAPIER.Quaternion( 0, 0, 0, 1 ), true );
        chassis.setLinvel( new physics.RAPIER.Vector3( 0, 0, 0 ), true );
        chassis.setAngvel( new physics.RAPIER.Vector3( 0, 0, 0 ), true );

        movement.accelerateForce.value = 0;
        movement.brakeForce.value = 0;

        return;

    }

    let accelerateForce = 0;

    if ( movement.forward < 0 ) {

        //if (movement.accelerateForce.value === 0) chassis.wakeUp();
        accelerateForce = movement.accelerateForce.value - movement.accelerateForce.step;
        if ( accelerateForce < movement.accelerateForce.min ) accelerateForce = movement.accelerateForce.min;

    } else if ( movement.forward > 0 ) {

        //if (movement.accelerateForce.value === 0) chassis.wakeUp();
        accelerateForce = movement.accelerateForce.value + movement.accelerateForce.step;

        if ( accelerateForce > movement.accelerateForce.max ) accelerateForce = movement.accelerateForce.max;

    } else {

        if ( chassis.isSleeping() ) chassis.wakeUp();

    }

    movement.accelerateForce.value = accelerateForce;

    //console.log(accelerateForce);

    let brakeForce = 0;

    if ( movement.brake > 0 ) {

        brakeForce = movement.brakeForce.value + movement.brakeForce.step;
        if ( brakeForce > movement.brakeForce.max ) brakeForce = movement.brakeForce.max;

    }

    movement.brakeForce.value = brakeForce;

    const engineForce = accelerateForce;

    vehicleController.setWheelEngineForce( 0, engineForce );
    vehicleController.setWheelEngineForce( 1, engineForce );

    const currentSteering = vehicleController.wheelSteering( 0 );
    const steerDirection = movement.right;
    const steerAngle = Math.PI / 4;

    const steering = THREE.MathUtils.lerp( currentSteering, steerAngle * steerDirection, 0.25 );

    vehicleController.setWheelSteering( 0, steering );
    vehicleController.setWheelSteering( 1, steering );

    const wheelBrake = movement.brake * brakeForce;
    vehicleController.setWheelBrake( 0, wheelBrake );
    vehicleController.setWheelBrake( 1, wheelBrake );
    vehicleController.setWheelBrake( 2, wheelBrake );
    vehicleController.setWheelBrake( 3, wheelBrake );

}

//light

const sun = new THREE.DirectionalLight( 0xFFFFFF );
sun.castShadow = true;
sun.position.set(25,30,0);
sun.target.position.set(-5,-5,0);
sun.shadow.camera.left = -80;
sun.shadow.camera.right = 80;
sun.shadow.camera.top = 80;
sun.shadow.camera.bottom = -80;
sun.shadow.normalBias = 0.2;
sun.shadow.mapSize.width = 4096;
sun.shadow.mapSize.height = 4096;
scene.add( sun );   

const shadowHelper = new THREE.CameraHelper( sun.shadow.camera );
scene.add( shadowHelper );
const helper = new THREE.DirectionalLightHelper( sun, 5 );
scene.add( helper );

const light = new THREE.AmbientLight( 0x404040, 3 ); // soft white light
scene.add( light );
const camera = new THREE.PerspectiveCamera( 
    75, sizes.width / sizes.height, 0.1, 1000 
);
scene.add( camera );
const controls = new OrbitControls( camera, canvas );
controls.update();
camera.position.y = 5;
camera.position.z = 5;

//events

function onResize(){
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();

    renderer.setSize( sizes.width, sizes.height );
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

function onPointerMove( event ) {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onClick( event ) {
    console.log(intersectObject);
}

window.addEventListener("resize", onResize);
window.addEventListener("click", onClick);
window.addEventListener("pointermove", onPointerMove);

window.addEventListener( 'keydown', ( event ) => {

    //console.log( event.key );
    if ( event.key === 'w' || event.key === 'ArrowUp' ) movement.forward = - 1;
    if ( event.key === 's' || event.key === 'ArrowDown' ) movement.forward = 1;
    if ( event.key === 'a' || event.key === 'ArrowLeft' ) movement.right = 1;
    if ( event.key === 'd' || event.key === 'ArrowRight' ) movement.right = - 1;
    if ( event.key === 'r' ) movement.reset = true;
    if ( event.key === ' ' ) movement.brake = 1;

} );

window.addEventListener( 'keyup', ( event ) => {

    if ( event.key === 'w' || event.key === 's' || event.key === 'ArrowUp' || event.key === 'ArrowDown' ) movement.forward = 0;
    if ( event.key === 'a' || event.key === 'd' || event.key === 'ArrowLeft' || event.key === 'ArrowRight' ) movement.right = 0;
    if ( event.key === 'r' ) movement.reset = false;
    if ( event.key === ' ' ) movement.brake = 0;

} );

//animate

function animate() {
    raycaster.setFromCamera( pointer, camera );

    const intersects = raycaster.intersectObjects( intersectObjects );
    
    if (intersects.length >0) {
        document.body.style.cursor = "pointer";
    }
    else {
        document.body.style.cursor = "default";
        intersectObject = "";
    }

    for (let i = 0; i < intersects.length; i++) {
        intersectObject = intersects[i].object.parent.name;
        //intersects[i].object.material.color.set(0xff0000);
    }

    if ( vehicleController ) {

        updateCarControl();
        vehicleController.updateVehicle( 1 / 60 );
        updateWheels();

    }
    if ( controls && car ) {

        controls.target.copy( car.position );
        controls.update();

    }
 //   if ( physicsHelper ) physicsHelper.update();

    renderer.render( scene, camera );
  }
  renderer.setAnimationLoop( animate );