import "core-js/features/promise";
import "core-js/features/array/from";
import "core-js/features/math/sign";
import * as BABYLON from 'babylonjs';
import 'babylonjs-loaders';
import * as GUI from 'babylonjs-gui';
import Hammer from 'hammerjs';
import Barrel from './Barrel';
import Entity, { EntityNode } from './Entity';

var canvas = document.getElementById("renderCanvas") as HTMLCanvasElement; // Get the canvas element
var engine = new BABYLON.Engine(canvas, true); // Generate the BABYLON 3D engine

let monkeyCar: BABYLON.AbstractMesh = null;
let camera: BABYLON.ArcFollowCamera;

var numBananas = 0;

let GOAL_BANANAS = 100;

let carSpeed = 0.005;
let desiredX = 0;

let gameTotalTime = 300;

let gameStart = Date.now();

let endDialogVisible = false;
let forceStopCar = false;

interface BarrelMathObject {
    number: number;
}

let incorrectBarrelMathObj: BarrelMathObject = null;

let currentCarQuestion: any[] = null;

const keys: { [k: string]: boolean; } = { };


function showFailureDialog(variant) {
    document.getElementById("failure-dialog-" + variant).style.display = "";
    endDialogVisible = true;
}

function showWinDialog() {
    document.getElementById("win-dialog").style.display = "";
    document.getElementById("num-coins-collected").textContent = numBananas as unknown as string;
    endDialogVisible = true;

}
function getParameterByName(name: string, url?: string): string|null {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, '\\$&');
    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

window.addEventListener("keydown", (ev) => {
    keys[ev.key] = true;
    if(ev.key == "ArrowLeft" || ev.key == "Left") {
        desiredX--;
        desiredX = Math.max(-1, desiredX);
    } else if(ev.key == "ArrowRight" || ev.key == "Right") {
        desiredX++;
        desiredX = Math.min(1, desiredX);
    }
});

window.addEventListener("keyup", (ev) => {
    keys[ev.key] = false;
});


function getRandomIntInclusive(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min; //The maximum is inclusive and the minimum is inclusive
}

/**
 * Shuffles array in place.
 * @param {Array} a items An array containing the items.
 */
function shuffle<T>(a: Array<T>): Array<T> {
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}

var minLeftNumber, minRightNumber, maxLeftNumber, maxRightNumber, operation;

const operationSymbol = { add: "&plus;", subtract: "&minus;", multiply: "&times;", divide: "&div;"};

/******* Add the create scene function ******/
var initGame = function () {
    var bananaGoal = parseInt(getParameterByName("bananaGoal"));
    var timeToPlay = parseInt(getParameterByName("timeToPlay"));

    Array.from(document.querySelectorAll(".operation-name")).forEach(e => e.textContent = operation.toUpperCase());
    if(!isNaN(bananaGoal))
        GOAL_BANANAS = bananaGoal;

    if(!isNaN(timeToPlay))
        gameTotalTime = timeToPlay;

    Array.from(document.querySelectorAll(".num-bananas")).forEach(e => e.textContent = GOAL_BANANAS.toString());
}

/**
 * Add or update a query string parameter. If no URI is given, we use the current
 * window.location.href value for the URI.
 *
 * Based on the DOM URL parser described here:
 * http://james.padolsey.com/javascript/parsing-urls-with-the-dom/
 *
 * @param   (string)    uri     Optional: The URI to add or update a parameter in
 * @param   (string)    key     The key to add or update
 * @param   (string)    value   The new value to set for key
 *
 * Tested on Chrome 34, Firefox 29, IE 7 and 11
 */
function update_query_string(uri: string|undefined, key: string, value: string): string {
	// Use window URL if no query string is provided
	if ( ! uri ) { uri = window.location.href; }

	// Create a dummy element to parse the URI with
	var a = document.createElement( 'a' ),

		// match the key, optional square brackets, an equals sign or end of string, the optional value
		reg_ex = new RegExp( key + '((?:\\[[^\\]]*\\])?)(=|$)(.*)' ),

		// Setup some additional variables
		qs,
		qs_len,
		key_found = false;

	// Use the JS API to parse the URI
	a.href = uri;

	// If the URI doesn't have a query string, add it and return
	if ( ! a.search ) {

		a.search = '?' + key + '=' + value;

		return a.href;
	}

	// Split the query string by ampersands
	qs = a.search.replace( /^\?/, '' ).split( /&(?:amp;)?/ );
	qs_len = qs.length;

	// Loop through each query string part
	while ( qs_len > 0 ) {

		qs_len--;

		// Remove empty elements to prevent double ampersands
		if ( ! qs[qs_len] ) { qs.splice(qs_len, 1); continue; }

		// Check if the current part matches our key
		if ( reg_ex.test( qs[qs_len] ) ) {

			// Replace the current value
			qs[qs_len] = qs[qs_len].replace( reg_ex, key + '$1' ) + '=' + value;

			key_found = true;
		}
	}

	// If we haven't replaced any occurrences above, add the new parameter and value
	if ( ! key_found ) { qs.push( key + '=' + value ); }

	// Set the new query string
	a.search = '?' + qs.join( '&' );

	return a.href;
}

function vh(v) {
    var h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    return (v * h) / 100;
  }

function vw(v) {
    var w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    return (v * w) / 100;
}

function vmin(v) {
    return Math.min(vh(v), vw(v));
}

var createScene = async function() {


    // Create the scene space
    var scene = new BABYLON.Scene(engine);

    var barrels: Entity[] = [];
    const SCREEN_SIZE_SCALE = vmin(5);
    const DISTANCE = 16;

    function clearCarQuestion() {
        currentCarQuestion = null;
        let display = document.getElementById("current-car-question");
        display.textContent = "";
    }

    function generateCarQuestion() {
        let leftNum = getRandomIntInclusive(minLeftNumber, maxLeftNumber);
        let rightNum = getRandomIntInclusive(minRightNumber, maxRightNumber);

        if(operation != null)
            operation = operation.trim();

        let answer;

        if(operation == "add") {
            answer = leftNum + rightNum;
        } else if(operation == "subtract") {
            answer = leftNum - rightNum;
        } else if(operation == "multiply") {
            answer = leftNum * rightNum;
        } else
            throw new Error("unexpected operation");

        currentCarQuestion = [ leftNum, operationSymbol[operation], rightNum, answer, [] ];
        let display = document.getElementById("current-car-question");
        display.innerHTML = `${currentCarQuestion[0]} ${currentCarQuestion[1]} ${currentCarQuestion[2]} = ?`;
    }

    function tickBarrelSpawning(barrelTemplate) {
        if(currentCarQuestion == null)
            return;
        /* If there are less than 5 barrels in the scene, spawn more */
        let attempts = 0;
        while(barrels.length < 5) {
            attempts++;
            if(attempts >= 5)
                break;
            /* summon a barrel */
            var secondBarrel = barrelTemplate.clone("newBarrel", barrelTemplate.parent);
            secondBarrel.position.x = getRandomIntInclusive(-1, 1) * 2;
            secondBarrel.position.y = 0.25;
            secondBarrel.renderingGroupId = 5;
            secondBarrel.position.z = monkeyCar.position.z + 8 + (getRandomIntInclusive(2, 5) * DISTANCE);
            secondBarrel.checkCollisions = false;
            var isValid = true;
            for(var i = 0; i < barrels.length; i++) {
                let distance = barrels[i].obj.position.subtract(secondBarrel.position).lengthSquared();
                if(distance < 500) {
                    isValid = false;
                    break;
                }
            }
            if(!isValid) {
                secondBarrel.dispose();
                continue;
            }


            var label = new GUI.TextBlock();
            label.fontSize = Math.min(40, SCREEN_SIZE_SCALE);
            if(currentCarQuestion[4].length == 0) {
                for(var i = -10; i <= 10; i++) {
                    if(i == 0)
                        continue;
                    currentCarQuestion[4].push(currentCarQuestion[3] + i);
                }
                shuffle(currentCarQuestion[4]);
                currentCarQuestion[4] = currentCarQuestion[4].slice(0, 4);
                currentCarQuestion[4].push(currentCarQuestion[3]);
                shuffle(currentCarQuestion[4]);
            }
            const num = currentCarQuestion[4].pop();
            const obj = { number: num }; //numberSets.pop();
            label.text = `${num}`;
            label.zIndex = 5; //TOTAL - i;
            label.color = "White";
            advancedTexture.addControl(label);
            label.linkOffsetY = -50;
            label.linkWithMesh(secondBarrel);

            label.isVisible = false;
            let entity = new Barrel(secondBarrel, label, monkeyCar);
            (secondBarrel as EntityNode<BABYLON.AbstractMesh, Barrel>).entity = entity;
            barrels.push(entity);
            //barrels.push({ secondBarrel, label });
            (secondBarrel as any).mathObj = obj;
            secondBarrel.freezeWorldMatrix();
        }
        /* Check the current position of the car */
    }


    // Add lights to the scene
    var light1 = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(60, 60, 0), scene);

    // Add and manipulate meshes in the scene
    //monkeyCar = BABYLON.MeshBuilder.CreateSphere("sphere", {diameter:1}, scene);

    var cube = BABYLON.MeshBuilder.CreateBox("test", { width: 12, height: 0.5, depth: 350 }, scene);
    cube.position = new BABYLON.Vector3(0, 0, 0);
    cube.isPickable = false;

    var roadMaterial = new BABYLON.StandardMaterial("myMaterial", scene);
    var grassMaterial = new BABYLON.StandardMaterial("grassMaterial", scene);

    let roadTexture = new BABYLON.Texture("./road.jpg", scene);

    roadMaterial.diffuseTexture = roadTexture;
    roadMaterial.zOffset = -5.0;
    roadTexture.vScale = 3.0;
    roadTexture.uScale = 25.0;
    roadTexture.vOffset = 0.5;
    cube.material = roadMaterial;
    cube.renderingGroupId = 1;

    let grassTexture = new BABYLON.Texture("./textures/grass.jpg", scene);
    grassMaterial.diffuseTexture = grassTexture;
    grassTexture.uScale = 25.0;
    grassTexture.vScale = 60.0;

    let grassDepth = 400;
    var grassBox = BABYLON.MeshBuilder.CreateBox("grassBox", { width: 360, height: 0.5, depth: 100 }, scene);
    grassBox.position = new BABYLON.Vector3(0, -0.01, 0);
    grassBox.isPickable = false;
    grassBox.material = grassMaterial;
    grassBox.renderingGroupId = 1;
    var engineSound = null;


    await new Promise<void>(resolve => {
        BABYLON.SceneLoader.ImportMesh(null, "./", "Crysler_new_yorker.glb", scene, function (meshes) {
            monkeyCar = meshes[0];
            engineSound = new BABYLON.Sound("engine", "sounds/engineSound.wav", scene, null, {
                loop: true,
                autoplay: true,
                volume: 0.7
            });
            engineSound.attachToMesh(monkeyCar);
            monkeyCar.rotate(BABYLON.Axis.Y, Math.PI / 2, BABYLON.Space.LOCAL);
            monkeyCar.scaling.setAll(0.5);
            monkeyCar.position.y = 0.25;
            monkeyCar.checkCollisions = false;
            meshes.forEach(mesh => {
                mesh.isPickable = false;
                mesh.renderingGroupId = 1;
            });
            resolve();
        });
    });

    grassBox.parent = monkeyCar;
    cube.parent = monkeyCar;
    cube.rotate(new BABYLON.Vector3(0, 1, 0), Math.PI / 2);
    //cube.scaling = new BABYLON.Vector3(2, 1, 2);

    scene.collisionsEnabled = true;
    scene.clearColor = new BABYLON.Color4(0.529, 0.808, 0.922);
    scene.ambientColor = new BABYLON.Color3(0.3, 0.3, 0.3);


    var skybox = BABYLON.Mesh.CreateBox("skyBox", 100.0, scene);
    var skyboxMaterial = new BABYLON.StandardMaterial("skyBox", scene);
    skyboxMaterial.backFaceCulling = false;
    skyboxMaterial.disableLighting = true;
    skybox.material = skyboxMaterial;
    skybox.infiniteDistance = true;
    skyboxMaterial.disableLighting = true;
    skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture("textures/Ely2/Ely2", scene);
    skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
    skybox.renderingGroupId = 0;

    skyboxMaterial.freeze();

    skybox.convertToUnIndexedMesh();

    scene.fogMode = BABYLON.Scene.FOGMODE_LINEAR;
    scene.fogStart = 50;
    scene.fogEnd = 100;
    scene.fogColor = BABYLON.Color3.FromHexString("#8d97ba");

    var advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
    var barrelMaterial = new BABYLON.StandardMaterial("myMaterial", scene);
    barrelMaterial.diffuseTexture = new BABYLON.Texture("./barrel.jpg", scene);
    var metalMaterial = new BABYLON.StandardMaterial("metalMaterial", scene);
    metalMaterial.diffuseTexture = new BABYLON.Texture("./metal.jpg", scene);

    barrelMaterial.freeze();
    metalMaterial.freeze();

    scene.autoClear = false; // Color buffer
    scene.autoClearDepthAndStencil = false; // Depth and stencil, obviously

    //Array.from(document.querySelectorAll(".number-to-add")).forEach(e => e.textContent = totalNumber.toString());
    let barrelModel = await new Promise<BABYLON.AbstractMesh>(resolve => BABYLON.SceneLoader.ImportMesh(null, "./", "barrel.glb", scene, function (meshes) {
        meshes.forEach(mesh => {
            mesh.renderingGroupId = 1;
        });

        var barrel = meshes[0];
        barrel.scaling.setAll(0.01);
        barrel.position.y = -10; //0.25;
        barrel.position.z = 8;
        barrel.isVisible = false;
        barrel.name = "newBarrel_template";
        (barrel as any).correct = false;
        barrel.checkCollisions = false;
        barrel.renderingGroupId = 1;
        meshes[1].checkCollisions = false;
        meshes[2].isPickable = false;
        meshes[2].checkCollisions = false;
        meshes[1].material = barrelMaterial;
        meshes[2].material = metalMaterial;
        resolve(barrel);
    }));

    scene.registerBeforeRender(() => {
        barrels = barrels.filter(barrel => !barrel.isRemoved);
        barrels.forEach(barrel => barrel.renderTick());
    });

    setInterval(() => {
        tickBarrelSpawning(barrelModel);
        barrels.forEach(barrel => barrel.tick());
        /* Despawn any barrels more than 100 units away */
        barrels = barrels.filter(barrel => {
            if(BABYLON.Vector3.DistanceSquared(barrel.obj.position, monkeyCar.position) >= 10000) {
                (barrel as Barrel).remove();
                return false;
            }
            return true;
        });
    }, 50);

    // Parameters: name, position, scene
    var camera = new BABYLON.UniversalCamera("UniversalCamera", new BABYLON.Vector3(0, 0, 0), scene);

    var barrelBreak = new BABYLON.Sound("barrelBreak", "sounds/barrel_break.wav", scene, null, {
        loop: false,
        autoplay: false,
        volume: 1
    });
    var wrongSound = new BABYLON.Sound("wrongSound", "sounds/wrong.wav", scene, null, {
        loop: false,
        autoplay: false,
        volume: 1
    });
    var rightSound = new BABYLON.Sound("rightSound", "sounds/right.wav", scene, null, {
        loop: false,
        autoplay: false,
        volume: 0.5
    });
    camera.maxZ = 400;

    // Targets the camera to a particular position. In this case the scene origin
    const cameraOff =  new BABYLON.Vector3(0, 2, -6);

    var rattling = 0;
    const RATL = 10000;
    const CAMERAFOV = camera.fov;


    var hammertime = new Hammer(document.getElementById("renderCanvas"));
    hammertime.get('pan').set({ direction: Hammer.DIRECTION_ALL });
    hammertime.get('swipe').set({ direction: Hammer.DIRECTION_ALL });
    hammertime.on('pan', (e) => {
        console.log(e);
        if(e.velocityY < 0) {
            carSpeed += 0.06 * -e.velocityY;
            carSpeed = Math.min(0.5, carSpeed);
        } else if(e.velocityY > 0) {
            carSpeed -= 0.06 * e.velocityY;
            carSpeed = Math.max(0.03, carSpeed);
        }
    });
    hammertime.on('swipe', (e) => {
        if(e.velocityX < 0) {
            desiredX--;
            desiredX = Math.max(-1, desiredX);
        } else if(e.velocityX > 0) {
            desiredX++;
            desiredX = Math.min(1, desiredX);
        }
    });

    var correctAnswer: HTMLElement = document.querySelector(".correct-answer");
    scene.registerBeforeRender(() => {
        if (rattling >0) {
            rattling--;
            if (rattling%6 ==0) {
                camera.fov = CAMERAFOV + rattling/RATL;
                camera.rotation.z = rattling/RATL;
            }
            else if (rattling%6 ==3) {
                camera.fov = CAMERAFOV - rattling/RATL;
                camera.rotation.z = -rattling/RATL;
            }
        } else {
            camera.fov = CAMERAFOV;
            camera.rotation.z = 0;
        }
        if(endDialogVisible)
            return;
        if(monkeyCar == null)
            return;

        let frameDelta = scene.getEngine().getDeltaTime() / 16;

        let tooFar = false; //monkeyCar.position.z >= TILE_LENGTH;
        let endingGame = tooFar; // || numBananas >= GOAL_BANANAS;

        if(endingGame || forceStopCar) {
            if(forceStopCar) {
                correctAnswer.innerHTML = `${currentCarQuestion[0]} ${currentCarQuestion[1]} ${currentCarQuestion[2]} = ?`;
                correctAnswer.style.display = "";
            }
            carSpeed -= (forceStopCar ? 0.006 : 0.003) * frameDelta;
            carSpeed = Math.max(0, carSpeed);
            if(carSpeed <= 0) {
                if(forceStopCar) {
                    forceStopCar = false;
                    setTimeout(() => {
                        correctAnswer.innerHTML = `${currentCarQuestion[0]} ${currentCarQuestion[1]} ${currentCarQuestion[2]} = ${currentCarQuestion[3]}, not ${incorrectBarrelMathObj.number}`;
                        clearCarQuestion();
                        setTimeout(() => {
                            correctAnswer.style.display = "none";
                            incorrectBarrelMathObj = null;
                        }, 3000);
                    }, 2000);
                } else {
                    if(tooFar)
                        showFailureDialog("distance");

                }

            }
        } else if(incorrectBarrelMathObj == null) {
            if(keys.ArrowUp || keys.Up) {
                carSpeed += 0.001 * frameDelta;
                carSpeed = Math.min(0.8, carSpeed);
            } else if(keys.ArrowDown || keys.Down) {
                carSpeed -= 0.003 * frameDelta;
                carSpeed = Math.max(0.03, carSpeed);
            }
        }

        if(carSpeed > 0 && currentCarQuestion == null)
            generateCarQuestion();

        engineSound.setPlaybackRate((!forceStopCar && incorrectBarrelMathObj != null) ? 0 : (1 + (carSpeed / 0.17)));
        if(!endingGame && currentCarQuestion != null && incorrectBarrelMathObj == null && !forceStopCar) {
            var ray = new BABYLON.Ray(monkeyCar.position.add(new BABYLON.Vector3(0, 0.5, 0)), new BABYLON.Vector3(0,0,1), 4);


            var hit = scene.pickWithRay(ray, null, true);

            if(hit.pickedMesh != null) {
                let barrel: EntityNode<BABYLON.Node, Barrel> = hit.pickedMesh;
                while(barrel != null) {
                    if(barrel.name == "newBarrel")
                        break;
                    barrel = barrel.parent;
                }
                if(barrel != null) {
                    barrelBreak.setPosition((barrel as any).position);
                    barrelBreak.play();
                    let factor = Math.ceil(getRandomIntInclusive(2, 4) * (carSpeed / 0.2));
                    if((barrel as any).mathObj.number == currentCarQuestion[3]) {
                        numBananas += factor;
                        rightSound.play();
                        console.log("RIGHT");
                        clearCarQuestion();
                    } else {
                        console.log("WRONG");
                        wrongSound.play();
                        numBananas = Math.max(0, numBananas - factor);
                        rattling = 33;
                        incorrectBarrelMathObj = (barrel as any).mathObj;
                        forceStopCar = true;
                    }

                    document.querySelector(".num-banana").textContent = numBananas.toString();

                    barrel.entity.remove();
                }

            }
        }

        let prevX = monkeyCar.position.x;
        monkeyCar.position.z += carSpeed * frameDelta;
        grassTexture.vOffset -= carSpeed * frameDelta / 3;
        roadTexture.uOffset += carSpeed * frameDelta * (12/25) / 3.5;
        cube.setAbsolutePosition(new BABYLON.Vector3(0, cube.absolutePosition.y, cube.absolutePosition.z));
        monkeyCar.position.x = prevX;
        monkeyCar.position.y = 0.25;

        let realDesiredX = desiredX * 2;
        if(Math.abs(monkeyCar.position.x-realDesiredX) > 0.05) {
            let desiredDelta = Math.sign(realDesiredX-monkeyCar.position.x) * 0.05 * ((carSpeed * frameDelta) / 0.1);
            let realDelta = realDesiredX-monkeyCar.position.x;
            var prevCarX = monkeyCar.position.x;
            if(Math.abs(realDelta) < Math.abs(desiredDelta)) {
                monkeyCar.position.x = realDesiredX;
            } else
                monkeyCar.position.x += desiredDelta;
            grassTexture.uOffset -= (monkeyCar.position.x - prevCarX) / 3;
            monkeyCar.position.z -= 0.001 * frameDelta;
        }
        if(camera.name == "DebugCam")
            return;
        camera.position = monkeyCar.position.add(cameraOff);
        camera.setTarget(monkeyCar.position);
    });

    return scene;
};
/******* End of the create scene function ******/

(document.querySelector("#start-dialog .dialog-image-left") as HTMLElement).style.display = "";

var isMuted = false;
(window as any).toggleMuting = function(e) {
    if(typeof BABYLON.Engine.audioEngine.masterGain == 'undefined')
        return;
    isMuted = !isMuted;
    e.currentTarget.textContent = isMuted ? "Unmute" : "Mute";
    BABYLON.Engine.audioEngine.masterGain.gain.value = isMuted ? 0 : 1;
};

function getNumber(paramName, id) {
    var n = parseInt(getParameterByName(paramName));
    if(isNaN(n))
        n = parseInt((document.querySelector(id) as HTMLInputElement).value);
    if(isNaN(n) || (n <= 1 && !paramName.startsWith("min"))) {
        window.alert("Please enter a valid number (greater than one).");
        throw new Error("invalid number");
    }
    return n;
}

function onButtonClick(button) {
    minLeftNumber = getNumber("minleft", "#min-left-number");
    minRightNumber = getNumber("minright", "#min-right-number");
    maxLeftNumber = getNumber("maxleft", "#max-left-number");
    maxRightNumber = getNumber("maxright", "#max-right-number");
    operation = getParameterByName("operation");
    if(operation == null)
        operation = button.textContent.toLowerCase();

    // + "&operation=add";
    (async function() {
        (document.querySelector("#start-with-preloaded") as HTMLElement).style.display = "none";
        var startButtons = document.querySelector(".start-buttons") as HTMLElement;
        startButtons.innerHTML = "Starting game...";
        startButtons.style.display = "";
        initGame();
        //if(document.documentElement.requestFullscreen)
        //    await document.documentElement.requestFullscreen({ navigationUI: "hide" });
        var scene = await createScene(); //Call the createScene function
        Promise.resolve().then(() => {
            engine.resize();

            gameStart = Date.now();
            var timer = document.querySelector(".timer");
            var interval = setInterval(() => {
                if(endDialogVisible) {
                    clearInterval(interval);
                    return;
                }
                var remaining = Math.max(0, Math.round(gameTotalTime - ((Date.now()-gameStart) / 1000)));
                timer.textContent = "Time remaining: " + remaining + " seconds";
                if(remaining <= 0) {
                    if(numBananas >= GOAL_BANANAS)
                        showWinDialog();
                    else
                        showFailureDialog("time");
                }
            }, 1000);
            var firstRender = true;
            // Register a render loop to repeatedly render the scene
            engine.runRenderLoop(function () {
                if(firstRender) {
                    console.log("FIRST RENDER");
                    (document.querySelector("#start-dialog") as HTMLElement).style.display = "none";
                    (document.querySelector("#change-number") as HTMLElement).style.display = "";
                    (document.querySelector("#current-car-question") as HTMLElement).style.display = "";
                    firstRender = false;
                }
                if(!endDialogVisible)
                    scene.render();
            });

            // Watch for browser/canvas resize events
            window.addEventListener("resize", function () {
                engine.resize();
            });
        });
    })();
}

var requiredParams = [ "operation", "minleft", "minright", "maxleft", "maxright" ];

if(requiredParams.map(param => getParameterByName(param) != null).filter(isNotNull => !isNotNull).length == 0) {
    (document.querySelector(".start-buttons") as HTMLElement).style.display = "none";
    var preloaded = (document.querySelector("#start-with-preloaded") as HTMLElement);
    preloaded.style.display = "";
    preloaded.querySelector("button").addEventListener("click", () => onButtonClick(null));
    document.querySelectorAll(".target-number-container").forEach(container => (container as HTMLElement).style.display = "none");
}
document.querySelectorAll(".start-buttons button").forEach(button => button.addEventListener("click", function() {
    try {
        onButtonClick(button);
    } catch(e) {

    }
}));