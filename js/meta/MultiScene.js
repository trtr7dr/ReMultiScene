/*
 * trtr7dr for sacri.ru
 * 
 * three.js / https://threejs.org/
 */

"use strict";
import * as THREE from '../../three/build/three.module.js';
import { TrackballControls } from '../../three/jsm/controls/TrackballControls.js';
import { GLTFLoader } from '../../three/jsm/loaders/GLTFLoader.js';
import { DDSLoader } from '../../three/jsm/loaders/DDSLoader.js';
import { Reflector } from '../../three/jsm/Reflector.js';

import { EffectComposer } from '../../three/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from '../../three/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../../three/jsm/postprocessing/UnrealBloomPass.js';
import { AfterimagePass } from '../../three/jsm/postprocessing/AfterimagePass.js';
import { FilmPass } from '../../three/jsm/postprocessing/FilmPass.js';


import { ShaderPass } from '../../three/jsm/postprocessing/ShaderPass.js';
import { LuminosityShader } from '../../three/jsm/shaders/LuminosityShader.js';
import { SobelOperatorShader } from '../../three/jsm/shaders/SobelOperatorShader.js';

import Stats from '../../three/jsm/libs/stats.module.js';

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

class MultiScene {
    
    constants() {
        this.animationTime = 4; //скорость анимации (?)
        this.max_distance = 1500; //максимальное удаление камеры
        this.start_x = 1000;
        this.spline_point = 50;
        this.delta_spaceship_rotation = 0.01;
        this.delta_spaceship_position = 5;
        this.x_limit = 10; //при каком икс надо заканчивать сцену
        this.spaceship_start_deviation = 50;
        this.spaceship_light_opacity = 0.4;
        this.figure_rotation_delta = 0.01;
        this.figure_scale_delta = 0.008;
        this.object_rotation_delta = 0.05;
        this.points_count = 10000;
        this.scroll_dist_mobile_factor = 1.5;
        this.delta_scroll_def = 20;
        this.curve_point_count = 600;
        this.curve_animation_factor = 2000;
        this.reloc_timer = 10000;
        this.scroll_factor1 = 30; //параметры влияющие на плавность и скорость 
        this.scroll_factor2 = 5;
        this.mob_delta_factor = 0.05;
        this.ms_upd = 100;
    }

    constructor(data) {
        this.json = data;
        this.resTracker = new ResourceTracker();
        this.track = this.resTracker.track.bind(this.resTracker);
        this.words = ['ReMETA', 'sacri.ru', 're', 'meta', 'multi'];
        this.stats = Stats();
        this.now = Date.now();
        this.delta = Date.now();
        this.then = Date.now();
        this.res_param = HTMLControlls.res_param_get();
        this.lastY;
        this.h_fmob = document.documentElement.clientHeight;
        this.sauto = false;
        this.last_scene_id = Object.keys(this.json).length;
    }
    

    set_scenes(id) {
        this.scene_id = id;
        this.sname = 'scene' + id;
        let start = this.json[this.sname]['start_position'];
        this.scenes = {
            Scene: {
                name: 'Main',
                url: 'assets/models/' + this.json[this.sname]['gltf'] + '.gltf',
                cameraPos: new THREE.Vector3(start['x'], start['y'], start['z']),
                animationTime: this.animationTime,
                extensions: ['glTF']
            }
        };
    }

    camera_create() {
        if (this.scene_id === 1) {
            this.camera = new THREE.PerspectiveCamera(this.json[this.sname]['perspective'], this.w / this.h, 0.1, 1400);
            this.controls = new TrackballControls(this.camera, this.renderer.domElement);
            this.controls.maxDistance = this.max_distance;
            this.controls.enabled = false;
        }
        this.camera.position.x = this.start_x;
    }

    init(gltf) {
        this.set_scenes(gltf);
        this.mobile = false;
        this.mob_delta = 0;
        this.clock = new THREE.Clock();
        this.container = document.getElementById('container');
        this.w = this.container.offsetWidth / this.res_param;
        this.h = this.container.offsetHeight / this.res_param;

        this.step = 0;
        this.view = {
            "x": 0,
            "y": 0,
            "z": 0
        };
        
        this.keys = {
            'top': {
                'down': false,
                'code': 87,
                'param': 1,
                'axis': 'y',
                'smooth': false
            },
            'bottom': {
                'down': false,
                'code': 83,
                'param': -1,
                'axis': 'y',
                'smooth': false
            },
            'left': {
                'down': false,
                'code': 68,
                'param': -1,
                'axis': 'z',
                'smooth': false
            },
            'right': {
                'down': false,
                'code': 65,
                'param': 1,
                'axis': 'z',
                'smooth': false
            }
        };
        this.godrayRenderTargetResolutionMultiplier = 1.0 / 4.0;

        this.scene = new THREE.Scene();

        this.loader = new GLTFLoader();
        this.loader.setDDSLoader(new DDSLoader());
        this.add_shader();
        this.lisseners();
        this.keying();
        this.constants();
        setTimeout(HTMLControlls.controls, HTMLControlls.get_controls_time());
        HTMLControlls.res_check();
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
            let points = this.spline.getPoints(this.spline_point);
            let geometry = this.track(new THREE.BufferGeometry().setFromPoints(points));
            let material = this.track(new THREE.LineBasicMaterial({color: 0xff0000}));
            let curveObject = this.track(new THREE.Line(geometry, material));
            this.scene.add(curveObject);
        }
    }

    render_create() {
        if (this.scene_id === 1) {
            this.renderer = new THREE.WebGLRenderer({antialias: false, alpha: false});
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
        if (this.scene_id === 1) {
            this.composer = this.track(new EffectComposer(this.renderer));
            this.composer.addPass(new RenderPass(this.scene, this.camera));
            this.bloomPass = this.track(new UnrealBloomPass(new THREE.Vector2(this.w, this.h), 1.5, 0.4, 0.85));
            this.bloomPass.threshold = 0;
            this.bloomPass.strength = 1;
            this.bloomPass.radius = 0;
            this.composer.addPass(this.bloomPass);
            this.afterimagePass = new AfterimagePass(0);
            this.composer.addPass(this.afterimagePass);

            this.effectFilm = new FilmPass(0.35, 0.025, 648, false);
            this.composer.addPass(this.effectFilm);

            var effectGrayScale = new ShaderPass(LuminosityShader); //вариант без него
            this.composer.addPass(effectGrayScale);
            this.effectSobel = this.track(new ShaderPass(SobelOperatorShader));
            this.effectSobel.uniforms[ 'resolution' ].value.x = this.w;
            this.effectSobel.uniforms[ 'resolution' ].value.y = this.h;
            this.composer.addPass(this.effectSobel);
        }
        this.set_after_post(this.json[this.sname]['amsterdam']);
    }

    after_post() {
        if (this.afterimagePass.uniforms[ "damp" ].value === 0) {
            this.afterimagePass.uniforms[ "damp" ].value = 0.96;
        } else {
            this.afterimagePass.uniforms[ "damp" ].value = 0;
        }
    }

    after_switch() {
        let n = this.composer.passes[1].enabled;
        this.composer.passes[1].enabled = (n) ? false : true;
    }

    space_rotate(v) {
        switch (v) {
            case 'left':
                this.spaceship.rotation.y += this.delta_spaceship_rotation;
                break;
            case 'right':
                this.spaceship.rotation.y -= this.delta_spaceship_rotation;
                break;
            case 'up':
                this.spaceship.rotation.z += this.delta_spaceship_rotation;
                break;
            case 'down':
                this.spaceship.rotation.z -= this.delta_spaceship_rotation;
                break;
        }
    }

    space_go(v) {
        switch (v) {
            case 'up':
                this.spaceship.position.x -= this.delta_spaceship_position;
                this.camera.position.x -= this.delta_spaceship_position;
                break;
            case 'right':
                this.spaceship.position.z -= this.delta_spaceship_position;
                this.camera.position.z -= this.delta_spaceship_position;
                break;
            case 'left':
                this.spaceship.position.z += this.delta_spaceship_position;
                this.camera.position.z += this.delta_spaceship_position;
                break;

            case 'back':
                this.spaceship.position.x += this.delta_spaceship_position;
                this.camera.position.x += this.delta_spaceship_position;
                break;
        }
        if (this.camera.position.x < this.x_limit) {
            this.end_scenes();
        }
    }

    ship_light() {
        let n = this.spaceship.children[2].material.visible; //зависит от выгруженного gltf'а
        this.spaceship.children[2].material.visible = (n) ? false : true;
    }

    set_after_post(bools) {
        this.afterimagePass.uniforms[ "damp" ].value = (bools) ? 0.96 : 0;
    }

    onload() {

        if (this.scene_id === this.last_scene_id) {
            this.sauto_s();
        }
        this.figure = {
            'cubes': [],
            'text': [],
            'mirror': []
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
        let mark = this.json[this.sname]['extra_func'];
        if (mark.indexOf('add_img') !== -1) {
            this.add_img(1, [750, -100, -100]);
            this.add_img(3, [900, 5, 45]);
            this.add_img(3, [400, 40, 60]);
        }
        if (mark.indexOf('add_cube') !== -1) {
            for (let i = 0; i < 100; i++) {
                this.add_cube();
            }
        }
        if (mark.indexOf('add_text') !== -1) {
            this.add_text();
        }
        if (mark.indexOf('mirrors_massive') !== -1) {
            this.mirrors_massive();
        }
        if (mark.indexOf('point_massive') !== -1) {
            this.point_massive();
        }
        if (mark.indexOf('mirrors_custom') !== -1) {
            this.mirrors_custom();
        }

    }

    add_media(obj) {
        
        for(let i = 1; i <= 2; i++){
            let video = document.getElementById('v' + i);
            let texture = this.track(new THREE.VideoTexture(video));
            var parameters = {color: 0xffffff, map: texture, wireframe: false};
            obj[i - 1].material = this.track(new THREE.MeshLambertMaterial(parameters));
            video.play();
        }
    }
    add_info(obj) {
        for(let i = 1; i <= 4; i++){
            let video = document.getElementById('i' + i);
            let texture = this.track(new THREE.VideoTexture(video));
            var parameters = {color: 0xffffff, map: texture, wireframe: false};
            obj[i - 1].material = this.track(new THREE.MeshLambertMaterial(parameters));
            video.play();
        }
    }

    gltf_done(gltf) {
        let object = this.track(gltf.scene);

        if (this.scene_id === 1) {
            this.add_info(object.children);
        }

        if (this.json[this.sname]['extra_func'][0] === 'media') {
            this.add_media(object.children);
        }

        for (let i = 0; i < object.children.length; i++) {
            if (object.children[i].name === 'sky') {
                object.children[i].material = this.track(this.shaderMaterial);
            }
            this.track(object.children[i]);
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
        HTMLControlls.gltfReady();
        this.load_spaceship();
    }

    load_GLTF(url) {
        let self = this;
        return new Promise((resolve, reject) => {
            this.track(this.loader.load(url, function (gltf) {
                self.gltf_done(gltf);
            }, undefined, reject));

        });
    }

    spaceship_done(gltf) { //для конкретного карабля
        this.spaceship = this.track(gltf.scene);
        this.spaceship.position.x = this.camera.position.x - this.spaceship_start_deviation;
        this.spaceship.position.y = 0;
        this.spaceship.position.z = 0;
        this.add_obj(this.spaceship);
        const material = this.track(new THREE.MeshPhongMaterial({
            opacity: this.spaceship_light_opacity,
            transparent: true
        }));
        this.spaceship.children[2].material = material;
        this.spaceship.children[2].material.visible = false;
    }

    load_spaceship() {
        let self = this;
        return new Promise((resolve, reject) => {
            this.track(this.loader.load('assets/models/space.gltf', function (gltf) {
                self.spaceship_done(gltf);
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
        this.scene.add(light);

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
        let request = requestAnimationFrame(() => {
            this.animate();
            if (this.json[this.sname]['animation']) {
                this.mixer.update(this.clock.getDelta());
            }
            this.controls.update();
            this.composer.render();
        });
    }

    figure_scroll_rotate(d) {
        if (this.json[this.sname]['extra_func'].indexOf('add_sphere') !== -1) {
            this.figure.sphere.forEach((element) => {
                element.rotation.z += this.figure_rotation_delta * d;
                element.rotation.y += this.figure_rotation_delta * d;
                element.scale.x -= this.figure_scale_delta * d;
                element.scale.y -= this.figure_scale_delta * d;
                element.scale.z -= this.figure_scale_delta * d;
            });
        }
    }

    rotate_scene(d) {
        if (this.json[this.sname]['extra_func'].indexOf('rotate_scene') !== -1) {
            this.scene.rotation.x += this.figure_rotation_delta * d;
        }
    }

    scroll_for_object() {
        if (this.json[this.sname]['extra_func'].indexOf('mirrors_massive') !== -1) {
            this.figure.mirror.forEach((element) => {
                element.rotation.z += this.object_rotation_delta;
                element.rotation.y += this.object_rotation_delta;
            });
        }
    }

    render() {
    }

    get_step_size(filterLen, tapsPerPass, pass) {
        return filterLen * Math.pow(tapsPerPass, -pass);
    }

    rand_int(min, max) {
        return min + Math.floor((max - min) * Math.random());
    }

    text_done(font) {
        let geometry;
        for (let i = 0; i < 100; i++) {
            geometry = this.track(new THREE.TextBufferGeometry(this.words[this.rand_int(0, this.words.length)], {
                font: font,
                size: this.rand_int(10, 30),
                height: 1,
                curveSegments: 12,
                bevelEnabled: false,
                bevelThickness: 10,
                bevelSize: 8,
                bevelOffset: 0,
                bevelSegments: 5
            }));
            var obj = this.track(new THREE.Mesh(geometry, this.shaderGrad));
            obj.position.x = this.rand_int(1000, -1000);
            obj.position.y = this.rand_int(-500, -100);
            obj.position.z = this.rand_int(-500, 500);
            obj.rotation.x = this.rand_int(-90, 90);
            obj.rotation.y = this.rand_int(-90, 90);
            obj.rotation.z = this.rand_int(-90, 90);
            obj.random = this.rand_int(1, 20);
            this.figure.text.push(obj);
            this.scene.add(obj);
        }
    }
    add_text() {
        var loader = new THREE.FontLoader();
        let self = this;
        loader.load('assets/Proxima.json', function (font) {
            self.text_done(font);
        });
    }

    cube_done(texture) {
        let rnd = this.rand_int(1, 50);
        let geometry = this.track(new THREE.BoxGeometry(rnd, rnd, rnd));
        let material = this.track(new THREE.MeshBasicMaterial({map: texture}));
        let cube = this.track(new THREE.Mesh(geometry, material));
        cube.position.x = this.rand_int(1000, -1000);
        cube.position.y = this.rand_int(-500, 500);
        cube.position.z = this.rand_int(-500, 500);
        cube.rotation.x = this.rand_int(-90, 90);
        cube.rotation.y = this.rand_int(-90, 90);
        cube.rotation.z = this.rand_int(-90, 90);
        cube.random = this.rand_int(-100, 100);
        this.scene.add(cube);
        this.figure.cubes.push(cube);
    }
    
    add_cube() {
        let loader = new THREE.TextureLoader();
        let t = Math.floor(Math.random() * Math.floor(14)) + 1;
        let self = this;
        let txt = this.track(loader.load('assets/meta/multi/texture/' + t + '.png', function (texture) {
            self.cube_done(texture);
        }));
    }

    mirrors_massive(x = 580, y = 0, z = 0, size_y = 250, size_z = 250) {
        this.mir_wal = [];
        for (let j = 0; j < 3; j++) {
            for (let i = 0; i < 3; i++) {
                if ((i !== 0) || (j !== 1)) {
                    let geometry = this.track(new THREE.BoxGeometry(1, size_z, size_y));
                    this.mir_wal[i] = this.track(new Reflector(geometry, {
                        clipBias: 0.05,
                        textureWidth: this.w * window.devicePixelRatio,
                        textureHeight: this.h * window.devicePixelRatio,
                        color: 0x777777,
                        recursion: 1
                    }));
                    this.mir_wal[i].position.x = x - i;
                    this.mir_wal[i].position.y = i * size_y - 0;
                    this.mir_wal[i].position.z = j * size_z - 200;
                    this.mir_wal[i].rotation.z = -0.2;
                    this.figure.mirror.push(this.mir_wal[i]);
                    this.scene.add(this.mir_wal[i]);
                }
            }
        }
    }

    mirrors_custom() {
        let data = this.json[this.sname].mirror;
        let geometry, mirror;
        for (let i = 0; i < Object.keys(data).length; i++) {
            geometry = this.track(new THREE.BoxGeometry(1, data[i].size.w, data[i].size.h));
            mirror = this.track(new Reflector(geometry, {
                clipBias: 0.05,
                textureWidth: this.w * window.devicePixelRatio,
                textureHeight: this.h * window.devicePixelRatio,
                color: 0x777777,
                recursion: 1
            }));
            mirror.position.x = data[i].pos.x;
            mirror.position.y = data[i].pos.y;
            mirror.position.z = data[i].pos.z;
            mirror.rotation.x = data[i].rotate.x;
            mirror.rotation.y = data[i].rotate.y;
            mirror.rotation.z = data[i].rotate.z;
            this.scene.add(mirror);
        }
    }

    point_massive() {
        var vertices = [];
        for (var i = 0; i < this.points_count; i++) {
            var x = THREE.MathUtils.randFloatSpread(2000);
            var y = THREE.MathUtils.randFloatSpread(2000);
            var z = THREE.MathUtils.randFloatSpread(2000);
            vertices.push(x, y, z);
        }
        var geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        var material = this.track(new THREE.PointsMaterial({color: 0x888888}));
        var points = this.track(new THREE.Points(geometry, material));
        this.scene.add(points);
    }

    add_mirror() {
        var mirrorGeometry = this.track(new THREE.CircleGeometry(400, 400));
        this.groundMirror = this.track(new Reflector(mirrorGeometry, {
            clipBias: 0.05,
            textureWidth: this.w * window.devicePixelRatio,
            textureHeight: this.h * window.devicePixelRatio,
            color: 0x777777,
            recursion: 1
        }));
        this.groundMirror.rotation.y = 90;
        this.scene.add(this.groundMirror);
    }

    add_shader() {
        let texture = this.track(new THREE.TextureLoader().load("assets/3.png"));
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
    }
    scroll_timer_stop() {
        $.doTimeout('loopc');
    }

    scroll_step_done(coord, curve) {
        if (Math.abs(this.camera.position[coord] - curve[coord]) > 1) {
            let tmp = (this.camera.position[coord] > curve[coord]) ? -1 : 1;
            if (Math.abs(this.camera.position[coord] - curve[coord]) > (this.scroll_dist * this.scroll_factor1)) {
                curve[coord] += (this.scroll_dist * this.scroll_factor2) * tmp * (-1);
            }
            this.camera.position[coord] += Math.abs(this.camera.position[coord] - curve[coord]) / (this.scroll_dist * this.scroll_factor2) * tmp;
            if (this.camera.position.x < this.x_limit) { //проверка на окончание прокрутки
                this.refresh();
                return false;
            }
            return true;
        } else {
            return false;
        }
    }

    scroll_do(curve) {
        let self = this;
        $.doTimeout('loopc');
        $.doTimeout('loopc', 1, function () {
            self.spaceship.position.x = self.camera.position.x - self.spaceship_start_deviation;
            return Boolean(self.scroll_step_done('x', curve) + self.scroll_step_done('y', curve) + self.scroll_step_done('z', curve));
        });
    }

    do_step(d) {
        let nd = (d > 0) ? 1 : (-1);
        this.step += this.scroll_dist * (nd);
        return nd;
    }

    on_wheel(e) {
        let delta;
        if (this.mobile) {
            delta = this.mob_delta;
            this.scroll_dist = this.scroll_dist_mobile_factor;
        } else {
            e = e || window.event;
            delta = (e !== undefined) ? e.deltaY || e.detail || e.wheelDelta : this.delta_scroll_def;
        }
        delta = this.do_step(delta);
        this.figure_scroll_rotate(delta);
        this.rotate_scene(delta);
        this.step = (this.step < 0) ? 0 : this.step;
        let curve_coord = this.spline.getPoint(this.step / this.curve_point_count);
        this.scroll_do(curve_coord);
        this.uniforms[ "color" ].value.offsetHSL(0.005, 0, 0);
        if (!this.json[this.sname]['animation']) {
            this.mixer.update(curve_coord.x / this.curve_animation_factor);
        }
        this.scroll_for_object();
    }

    cursor_move(z, y) {
        y = this.h / 4 - y / 2;
        z = this.w / 4 - z / 2;
        this.controls.target = new THREE.Vector3(this.view.x, y, z);
        if (this.spaceship) {
            this.spaceship.position.x = this.camera.position.x - this.spaceship_start_deviation;
            this.spaceship.position.y = y;
            this.spaceship.position.z = z;
        }
    }

    refresh() {
        this.scene.rotation.x = 0;
        if (this.scene_id === Object.keys(this.json).length) {
            HTMLControlls.lastScene();
            this.end_scenes();
        } else {
            this.step = 0;
            this.renderer.clear(true, true, true);
            this.set_scenes((this.scene_id + 1));
            this.resTracker.dispose();
            this.renderer.dispose();
            this.onload();
        }
    }
    
    reloc() {
        window.location = '/';
    }

    end_scenes() {
        $.doTimeout('a_scroll');
        HTMLControlls.endScene();
        setTimeout(this.reloc(), this.reloc_timer);
    }

    mobile_info() {
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|BB|PlayBook|IEMobile|Windows Phone|Kindle|Silk|Opera Mini/i.test(navigator.userAgent)) {
            HTMLControlls.mobileIcon();
        } else {
            setTimeout(HTMLControlls.drop_wsda, HTMLControlls.get_controls_time());
        }
    }

    sauto_s() {
        this.sauto = false;
        $.doTimeout('a_scroll');
        $('#play img').attr('src', 'assets/play.png');
    }

    sautos() {
        if (this.sauto) {
            this.sauto = false;
            $.doTimeout('a_scroll');
            $('#play img').attr('src', 'assets/play.png');
        } else {
            this.sauto = true;
            $('#play img').attr('src', 'assets/stop.png');
            let self = this;
            $.doTimeout('a_scroll', self.ms_upd, function () {
                self.on_wheel();
                return true;
            });
        }
    }

    lisseners() {
        var self = this;
        this.mobile_info();
        
        $('#loader').on('wheel', function (e) {
            if (self.scene_id !== self.last_scene_id) {
                $.doTimeout('a_scroll');
                $('#play').removeClass("auto_scroll_on");
                self.on_wheel();
            }
        });

        $('#loader').on('touchmove', function (e) {
            self.mobile = true;
            var currentY = e.originalEvent.touches[0].clientY;
            self.mob_delta = (currentY > this.lastY) ? (-1) * self.mob_delta_factor : self.mob_delta_factor;
            this.lastY = currentY;
            $('#loader').trigger('wheel');
        });

        $('#play').click(function () {
            self.sautos();
        });

        $("#loader").mousemove(function (event) {
            if (self.scene_id !== self.last_scene_id) {
                self.cursor_move(event.clientX / self.res_param, event.clientY / self.res_param);
            }
        });

        $("#loader").click(function ( ) {
            self.ship_light();
        });
    }

    keying() {
        var self = this;
        $('body').keydown(function (event) {
            switch (event.keyCode) {
                case 49:
                    self.after_post();
                    HTMLControlls.rand_rotate();
                    AudioControlls.effects();
                    break;
                case 50:
                    self.after_switch();
                    break;
                case 37:
                    self.space_rotate('left');
                    break;
                case 39:
                    self.space_rotate('right');
                    break;
                case 38:
                    self.space_rotate('up');
                    break;
                case 40:
                    self.space_rotate('down');
                    break;
                case 87:
                    self.space_go('up');
                    break;
                case 68:
                    self.space_go('right');
                    break;
                case 65:
                    self.space_go('left');
                    break;
                case 83:
                    self.space_go('back');
                    break;
            }
        });
    }
}

var mScene = new MultiScene(json);
mScene.init(1);
mScene.onload();

$("#dis").click(function ( ) {
    window.location = '/';
});
