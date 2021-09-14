"use strict";
import * as THREE from './three/build/three.module.js';
import { TrackballControls } from './three/jsm/controls/TrackballControls.js';
import { GLTFLoader } from './three/jsm/loaders/GLTFLoader.js';
import { DDSLoader } from './three/jsm/loaders/DDSLoader.js';
import { Reflector } from './three/jsm/Reflector.js';

import { EffectComposer } from './three/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from './three/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from './three/jsm/postprocessing/UnrealBloomPass.js';
import { AfterimagePass } from './three/jsm/postprocessing/AfterimagePass.js';
import { FilmPass } from './three/jsm/postprocessing/FilmPass.js';

import { BokehPass } from './three/jsm/postprocessing/BokehPass.js'; //нет в ресурстрекере

import { OutlinePass } from './three/jsm/postprocessing/OutlinePass.js';


import { ShaderPass } from './three/jsm/postprocessing/ShaderPass.js';
import { LuminosityShader } from './three/jsm/shaders/LuminosityShader.js';
import { SobelOperatorShader } from './three/jsm/shaders/SobelOperatorShader.js';




class ResourceTracker {
    constructor() {
        this.resources = new Set();
    }
    track(resource) {
        if (!resource) {
            return resource;
        }

        if (Array.isArray(resource)) {
            resource.forEach(resource => this.track(resource));
            return resource;
        }

        if (resource.dispose || resource instanceof THREE.Object3D) {
            this.resources.add(resource);
        }
        if (resource instanceof THREE.Object3D) {
            this.track(resource.geometry);
            this.track(resource.material);
            this.track(resource.children);
        } else if (resource instanceof THREE.Material) {
            for (const value of Object.values(resource)) {
                if (value instanceof THREE.Texture) {
                    this.track(value);
                }
            }
            if (resource.uniforms) {
                for (const value of Object.values(resource.uniforms)) {
                    if (value) {
                        const uniformValue = value.value;
                        if (uniformValue instanceof THREE.Texture ||
                                Array.isArray(uniformValue)) {
                            this.track(uniformValue);
                        }
                    }
                }
            }
        }
        return resource;
    }
    untrack(resource) {
        this.resources.delete(resource);
    }

    disposeNode(node) {
        if (node.geometry) {
            node.geometry.dispose();
        }
        if (node.material) {
            var materialArray;
            if (node.material instanceof THREE.MeshFaceMaterial || node.material instanceof THREE.MultiMaterial) {
                materialArray = node.material.materials;
            } else if (node.material instanceof Array) {
                materialArray = node.material;
            }
            if (materialArray) {
                materialArray.forEach(function (mtrl, idx) {
                    if (mtrl.map)
                        mtrl.map.dispose();
                    if (mtrl.lightMap)
                        mtrl.lightMap.dispose();
                    if (mtrl.bumpMap)
                        mtrl.bumpMap.dispose();
                    if (mtrl.normalMap)
                        mtrl.normalMap.dispose();
                    if (mtrl.specularMap)
                        mtrl.specularMap.dispose();
                    if (mtrl.envMap)
                        mtrl.envMap.dispose();
                    mtrl.dispose();
                });
            } else {
                if (node.material.map)
                    node.material.map.dispose();
                if (node.material.lightMap)
                    node.material.lightMap.dispose();
                if (node.material.bumpMap)
                    node.material.bumpMap.dispose();
                if (node.material.normalMap)
                    node.material.normalMap.dispose();
                if (node.material.specularMap)
                    node.material.specularMap.dispose();
                if (node.material.envMap)
                    node.material.envMap.dispose();
                node.material.dispose();
            }
        }
        if (node.dispose) {
            node.dispose();
        }
    }

    dispose() {

        for (let i = 0; i < mScene.scene.children.length; i++) {
            this.disposeNode(mScene.scene.children[i]);
            mScene.scene.remove(mScene.scene.children[i]);
        }
        for (const resource of this.resources) {

            if (resource instanceof THREE.Object3D) {
                if (resource.parent) {
                    resource.parent.remove(resource);
                }
                if (Boolean(resource.material)) {
                    resource.material.dispose();
                    resource.remove(resource.material);
                }
                if (Boolean(resource.geometry)) {
                    resource.geometry.dispose();
                    resource.remove(resource.geometry);
                }
                if (Boolean(resource.texture)) {
                    resource.texture.dispose();
                    resource.remove(resource.texture.geometry);
                }
            }
            if (resource.dispose) {
                resource.dispose();
            }
        }
        this.resources.clear();
        mScene.renderer.dispose();

        this.disposeNode(mScene.afterimagePass);
        for (let key in mScene.afterimagePass) {
            this.disposeNode(mScene.afterimagePass[key]);
        }

        this.disposeNode(mScene.bloomPass);
        for (let key in mScene.bloomPass) {
            this.disposeNode(mScene.bloomPass[key]);
        }

        for (let key in mScene.composer) {
            this.disposeNode(mScene.composer[key]);
        }

        for (let key in mScene.renderer) {
            this.disposeNode(mScene.renderer[key]);
        }

        this.disposeNode(mScene.effectFilm);
        for (let key in mScene.effectFilm) {
            this.disposeNode(mScene.effectFilm[key]);
        }

        this.disposeNode(mScene.effectSobel);
        for (let key in mScene.effectSobel) {
            this.disposeNode(mScene.effectSobel[key]);
        }
    }
}

class Min3dScene {

    constructor(data) {
        this.json = data;
        this.resTracker = new ResourceTracker();
        this.track = this.resTracker.track.bind(this.resTracker);
        this.now = Date.now();
        this.delta = Date.now();
        this.then = Date.now();
        this.res_param = HTMLControlls.res_param_get();
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
    }

    onMouseMove(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }

    set_scenes(id) {
        this.scene_id = id;
        this.sname = 'scene' + id;
        let start = this.json[this.sname]['start_position'];
        this.scenes = {
            Scene: {
                name: 'Main',
                url: 'models/' + this.json[this.sname]['gltf'] + '.gltf',
                cameraPos: new THREE.Vector3(start['x'], start['y'], start['z']),
            }
        };
    }

    camera_create() {
        if (this.scene_id === 1) {
            this.camera = new THREE.PerspectiveCamera(this.json[this.sname]['perspective'], this.w / this.h, 0.1, 1400);
            this.controls = new TrackballControls(this.camera, this.renderer.domElement);
            this.controls.maxDistance = 1500;
            this.controls.enabled = false;
        }
        this.camera.position.x = 1000;
        this.controls.target = new THREE.Vector3(-1, 0, 0);
    }

    init(gltf) {
        this.set_scenes(gltf);
        this.mobile = false;
        this.mob_delta = 0;
        this.clock = new THREE.Clock();
        this.container = document.getElementById('container');
        this.w = this.container.offsetWidth / this.res_param;
        this.h = this.container.offsetHeight / this.res_param;
        this.container.style.height = '100vh';

        this.step = 0;
        this.lookSpeed = 0.5;
        this.view = {
            "x": 0,
            "y": 0,
            "z": 0
        };
        this.lookFlag = false;
        this.smoothing = 50;

        this.scene = new THREE.Scene();
        this.scene.background = 'white';
        this.loader = new GLTFLoader();
        this.loader.setDDSLoader(new DDSLoader());
        this.add_shader();
    }

    set_path() {
        let dots = this.json[this.sname]['path'];
        let vectors = [];
        for (let i = 0; i < Object.keys(dots).length; i++) {
            vectors.push(new THREE.Vector3(dots[i][0], dots[i][1], dots[i][2]));
        }
        this.spline = new THREE.CatmullRomCurve3(vectors);
        this.spline.closed = false;
        if (this.json[this.sname]['debug']) {
            let points = this.spline.getPoints(50);
            let geometry = this.track(new THREE.BufferGeometry().setFromPoints(points));
            let material = this.track(new THREE.LineBasicMaterial({color: 0xff0000}));
            let curveObject = this.track(new THREE.Line(geometry, material));
            this.scene.add(curveObject);
        }
    }

    render_create() {
        if (this.scene_id === 1) {
            this.renderer = new THREE.WebGLRenderer({antialias: true, alpha: false});
            this.renderer.autoClear = true;
            this.renderer.autoClearColor = true;
            this.renderer.autoClearDepth = true;
            this.renderer.autoClearStencil = true;
            this.renderer.debug.checkShaderErrors = false;
            this.renderer.localClippingEnabled = true;
            this.container.appendChild(this.renderer.domElement);
        }
    }

    postprocessing_create() {
        this.composer = this.track(new EffectComposer(this.renderer));
        this.composer.addPass(new RenderPass(this.scene, this.camera));
        this.bloomPass = this.track(new UnrealBloomPass(new THREE.Vector2(this.w, this.h), 1.5, 0.4, 0.85));
        this.bokehPass = new BokehPass(this.scene, this.camera, {
            focus: 2.75,
            aperture: 0.005,
            maxblur: 0.01,
            width: this.w,
            height: this.h
        });
        this.bloomPass.threshold = 0.9;
        this.bloomPass.strength = 0.3;
        this.bloomPass.radius = 1;
        //this.composer.bokeh = this.bokehPass;

        this.afterimagePass = new AfterimagePass();
        this.afterimagePass.uniforms[ "damp" ].value = 0.3;
        this.afterimagePass.renderToScreen = true;
    }

    onload() {
        this.figure = {
            'cubes': [],
            'text': []
        };
        this.render_create();
        this.camera_create();
        this.postprocessing_create();

        this.container.style.background = this.json[this.sname]['background'];
        this.container.style.filter = this.json[this.sname]['css']['filter'];
        this.scroll_dist = this.json[this.sname]['speed'];
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(this.w, this.h);
        this.composer.setSize(this.w, this.h);
        this.renderer.physicallyCorrectLights = true;
        this.set_path();
        this.extra();
        this.init_scene(this.scenes[ 'Scene' ]);
    }

    extra() {

    }

    page_change(vector) {
        let flag = false;
        if (vector === 'next' && this.page_num !== this.pagelength + 1) {
            mScene.page_next();
        } else if (vector === 'prev' && this.page_num !== 1) {
            mScene.page_prev();
        }
    }

    pic_set() {
        $.doTimeout('pic_set', 24, function () {
            let pic = mScene.pic['illustration' + mScene.page_num];
            if (typeof pic !== 'undefined') {
                if (parseInt(pic['num']) === mScene.page_num && pic.position.y > 0) {
                    pic.position.y -= 0.2;
                    return true;
                }
            }
            for (const [key] of Object.entries(mScene.pic)) {
                if (mScene.pic[key].position.y < 3 && parseInt(mScene.pic[key]['num']) !== mScene.page_num) {
                    mScene.pic[key].position.y += 0.2;
                    return true;
                }
            };
            
            return false;
        });
    }
    

    gltf_done(gltf) {
        let object = this.track(gltf.scene);
        this.gltf_data = gltf.scene.children;

        if (this.json[this.sname]['extra_func'][0] === 'media') {
            this.add_media(object.children);
        }
        let animations = gltf.animations;
        this.mixer = this.track(new THREE.AnimationMixer(object));
        for (let i = 0; i < animations.length; i++) {
            let animation = animations[ i ];
            if (this.time) {
                animation.duration = this.time;
            }
            if (!this.json[this.sname]['animation']) {
                this.mixer.update(this.clock.getDelta());
            }
            let action = this.mixer.clipAction(animation);
            action.play();
        }
        this.add_obj(object);
        this.on_window_resize();
        this.animate();
        this.pagelength = 0;

    }

    load_GLTF(url) {
        let self = this;
        return new Promise((resolve, reject) => {
            this.track(this.loader.load(url, function (gltf) {
                self.gltf_done(gltf);
            }, undefined, reject));
        });
    }

    init_scene(sceneInfo) {
        let fog = this.json[this.sname]['fog'];
        this.scene.fog = this.track(new THREE.Fog(new THREE.Color(fog.color), fog.near, fog.far));

        let ambient = this.track(new THREE.AmbientLight(this.json[this.sname]['ambient']));
        this.scene.add(ambient);
        let lgt = this.json[this.sname]['light'];
        let light = this.track(new THREE.HemisphereLight(lgt.sky, lgt.color, lgt.power));
        light.position.x = 25;
        light.position.y = 10;
        light.position.z = 10;
        this.scene.add(light);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1, 100);
        directionalLight.position.set(0, 1, 0);
        this.scene.add(directionalLight);

        directionalLight.shadow.mapSize.width = 512; // default
        directionalLight.shadow.mapSize.height = 512; // default
        directionalLight.shadow.camera.near = 0.5; // default
        directionalLight.shadow.camera.far = 500; // default
        this.renderer.shadowMap.enabled = true; //?
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.gltf = this.load_GLTF(sceneInfo.url);
        this.camera.position.copy(sceneInfo.cameraPos);
    }

    add_obj(obj) {
        this.scene.add(obj);
    }

    on_window_resize() {
        this.camera.aspect = this.container.offsetWidth / this.container.offsetHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.offsetWidth, this.container.offsetHeight);
    }

    animate() {
        const time = performance.now();
        mScene.materialat.uniforms.time.value = performance.now() * 0.005;
        requestAnimationFrame(mScene.animate);
        if (mScene.json[mScene.sname]['animation']) {
            mScene.mixer.update(mScene.clock.getDelta());
        }
        mScene.controls.update();
        mScene.render();
        mScene.composer.render(mScene.delta);
    }

    render() {
    }

    rand_int(min, max) {
        return min + Math.floor((max - min) * Math.random());
    }

    add_shader() {
        let texture = this.track(new THREE.TextureLoader().load("1.png"));
        this.uniforms = {
            "amplitude": {value: 1.0},
            "color": {value: new THREE.Color(0xff2200)},
            "colorTexture": {value: texture}
        };
        this.uniforms.resolution = {type: 'v2', value: new THREE.Vector2(this.w, this.h)};
        this.uniforms[ "colorTexture" ].value.wrapS = this.uniforms[ "colorTexture" ].value.wrapT = THREE.RepeatWrapping;
        this.shaderMaterial = new THREE.ShaderMaterial({
            uniforms: this.uniforms,
            vertexShader: document.getElementById('vertexshader').textContent,
            fragmentShader: document.getElementById('fragmentshader').textContent
        });
        this.shader_speed = 0.001;
        this.shaderGrad = new THREE.ShaderMaterial({
            uniforms: this.uniforms,
            fragmentShader: document.getElementById('fragShader').textContent
        });

        const vertexCount = 200 * 3;
        const colors = [];
        for (let i = 0; i < vertexCount; i++) {
            colors.push(Math.random() * 255);
            colors.push(Math.random() * 255);
            colors.push(Math.random() * 255);
            colors.push(Math.random() * 255);

        }
        this.colorAttribute = new THREE.Uint8BufferAttribute(colors, 4);
        this.colorAttribute.normalized = true;
        this.materialat = new THREE.RawShaderMaterial({
            uniforms: {
                time: {value: 0}
            },
            vertexShader: document.getElementById('vertexShaderat').textContent,
            fragmentShader: document.getElementById('fragmentShaderat').textContent,
            side: THREE.DoubleSide,
            transparent: true
        });
        this.materialatw = new THREE.RawShaderMaterial({
            uniforms: {
                time: {value: 0}
            },
            vertexShader: document.getElementById('vertexShaderat').textContent,
            fragmentShader: document.getElementById('fragmentShaderat').textContent,
            side: THREE.DoubleSide,
            wireframe: true,
            transparent: true
        });
    }

    addSelectedObject(object) {
        this.selectedObjects = [];
        this.selectedObjects.push(object);
    }

    inter_click() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        let intersects = this.raycaster.intersectObjects(this.scene.children);
        if (intersects.length > 0) {

        }
    }

    inter() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        let intersects = this.raycaster.intersectObjects(this.scene.children);
        if (intersects.length > 0 && intersects[ 0 ].object.name !== 'ousia') {

            let selectedObject = intersects[ 0 ].object;
            selectedObject.scale.set(2, 2, 2);
            this.addSelectedObject(selectedObject);
            HTMLControlls.outline(true);

        } else {
            if (this.selectedObjects) {
                for (let i = 0; i < Object.keys(this.selectedObjects).length; i++) {
                    this.selectedObjects[i].scale.set(1, 1, 1);
                }
                //selectedObject.scale.set(1, 1, 1);
                HTMLControlls.outline(false);
            }
        }
    }

    cursor_move(z, y) {
        y = this.h / 100 - y / 50;
        z = this.w / 100 - z / 50;
        this.controls.target = new THREE.Vector3(this.view.x, y, z);
    }

    path_camera_move(x, y, z) {
        this.controls.target = new THREE.Vector3(x, y, z);
    }

    reloc() {
    }

    end_scenes() {
        $.doTimeout('a_scroll');
        HTMLControlls.endScene();
        setTimeout(mScene.reloc(), 10000);
    }
}

// Старт событий и таймеров

var json = {
    "scene1": {
        "gltf": "scene",
        "perspective": 60, //перспектива камеры
        "background": "white",
        "ambient": "rgb(255, 255, 0)",
        'post': '',
        'start_position': {
            "x": 1,
            "y": 0,
            "z": 0
        },
        "light": {
            'sky': "rgb(146,181,249)",
            'color': "rgb(255, 255, 255)",
            'power': 5
        },
        "path": {
            "0": [150, 10, 0]
        },
        "fog": {
            "color": "rgb(100, 0, 0)",
            "near": 10,
            "far": 1000
        },
        'animation': true, // автоматическая или при прокрутке
        "extra_func": [
//            'add_cube'
            // доп функции. Необходимо добавить проверку в классе Min3dScene
        ],
        "css": {
            "filter": "none"
        },
        "amsterdam": false, // автоматически включать AfterimagePass
        "debug": false, // рисовать маршрут движения камеры
        'speed': 15
    }
};

var mScene = new M3dScene(json);
mScene.init(1);
mScene.onload();

$('#container').on('wheel', function (e) {
    $.doTimeout('a_scroll');
    $('#play').removeClass("auto_scroll_on");
    mScene.on_wheel();
});

var lastY;
var h_fmob = document.documentElement.clientHeight;
$('#loader').on('touchmove', function (e) {
    mScene.mobile = true;
    var currentY = e.originalEvent.touches[0].clientY;
    mScene.mob_delta = (currentY > lastY) ? -0.05 : 0.05;
    lastY = currentY;
    $('#loader').trigger('wheel');
});

if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|BB|PlayBook|IEMobile|Windows Phone|Kindle|Silk|Opera Mini/i.test(navigator.userAgent)) {
    //HTMLControlls.mobileIcon();
} else {
    
}


$("#container").click(function (event) { // обработка ссылок
    mScene.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mScene.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    mScene.inter_click();
});

document.oncontextmenu = function () {
    return false;
};


$("#container").mousemove(function (event) {
    mScene.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mScene.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    mScene.cursor_move(event.clientX / mScene.res_param, event.clientY / mScene.res_param);
    mScene.inter();
});
