(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = "precision mediump float;\n\nuniform vec2 resolution;\nuniform vec2 mouse;\nuniform float time;\n\nvoid main(void) {\n\n  // 丸い形に色をぬるための計算\n  float f = length(gl_PointCoord - vec2(0.5, 0.5));\n  if (f > 0.1) {\n    discard;\n  }\n\n  // gradient\n  // vec2 uv = gl_FragCoord.xy / resolution.xy;\n  // vec3 color = 0.5 + 0.5 * cos((time * 1.0) + uv.xyx + vec3(0.0, 2.0, 4.0));\n  // gl_FragColor = vec4(color, 1.0);\n\n  // white\n  vec3 color = vec3(1.0, 1.0, 1.0);\n  gl_FragColor = vec4(color, 1.0);\n}\n";

},{}],2:[function(require,module,exports){
module.exports = "precision mediump float;\n\nuniform vec2 resolution;\nuniform vec2 mouse;\nuniform float time;\n\nuniform sampler2D texturePosition;\nuniform float cameraConstant;\nuniform float density;\nvarying vec2 vUv;\nuniform float radius;\n\nvoid main(void) {\n\n  vec4 posTemp = texture2D(texturePosition, uv);\n  vec3 pos = posTemp.xyz;\n\n  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);\n\n  // ポイントのサイズを決定\n  gl_PointSize = 0.5 * cameraConstant / (- mvPosition.z);\n\n  // uv情報の引き渡し\n  vUv = uv;\n\n  // 変換して格納\n  gl_Position = projectionMatrix * mvPosition;\n}\n";

},{}],3:[function(require,module,exports){
module.exports = "precision mediump float;\n\n// uniform vec2 resolution;\n// uniform vec2 mouse;\n// uniform float time;\n//\n// uniform sampler2D texturePosition;\n// uniform sampler2D textureVelocity;\n\n// 現在の位置情報を決定する\n#define delta (1.0 / 60.0)\n\nvoid main(void) {\n\n  vec2 uv = gl_FragCoord.xy / resolution.xy;\n  vec4 tmpPos = texture2D(texturePosition, uv);\n  vec3 pos = tmpPos.xyz;\n  vec4 tmpVel = texture2D(textureVelocity, uv);\n\n  // velが移動する方向(もう一つ下のcomputeShaderVelocityを参照)\n  vec3 vel = tmpVel.xyz;\n\n  // 移動する方向に速度を掛け合わせた数値を現在地に加える。\n  pos += vel * delta;\n\n  gl_FragColor = vec4(pos, 1.0);\n}\n";

},{}],4:[function(require,module,exports){
module.exports = "precision mediump float;\n\n// 移動方向についていろいろ計算できるシェーダー。\n// 今回はなにもしてない。\n// ここでVelのx y zについて情報を上書きすると、それに応じて移動方向が変わる\n// #include <common>\n\n// uniform vec2 resolution;\n// uniform vec2 mouse;\nuniform float time;\n//\n// uniform sampler2D texturePosition;\n// uniform sampler2D textureVelocity;\n\nvoid main(void) {\n\n  vec2 uv = gl_FragCoord.xy / resolution.xy;\n\n  vec4 tmpVel = texture2D(textureVelocity, uv);\n  // float idParticle = uv.y * resolution.x + uv.x;\n\n  // default\n  // vec3 vel = tmpVel.xyz;\n  // gl_FragColor = vec4(vel.xyz, 1.0);\n\n  // using glsl\n  float posX = tmpVel.x;\n  float posY = tmpVel.y;\n  float posZ = tmpVel.z;\n  vec3 pos = vec3(posX, posY, posZ);\n  gl_FragColor = vec4(pos, 1.0);\n\n}\n";

},{}],5:[function(require,module,exports){
'use strict';

(function () {

  // ==================================================
  // 　　MAIN
  // ==================================================

  window.addEventListener('load', function () {

    // ==================================================
    // 　　CLASS
    // ==================================================

    // 頂点情報のシェーダー
    var positionFrag = require('./../_shader/position.frag');

    // 移動方向を決定するシェーダー
    var velocityFrag = require('./../_shader/velocity.frag');

    // パーティクルを描写するためのシェーダー
    var perticleVert = require('./../_shader/perticle.vert');
    var perticleFrag = require('./../_shader/perticle.frag');

    var w = 512;
    var perticles = w * w;

    // メモリ負荷確認用
    var stats = void 0;

    // 基本セット
    var container = void 0,
        camera = void 0,
        scene = void 0,
        renderer = void 0,
        geometry = void 0,
        material = void 0,
        controls = void 0;

    // gpgpuをするために必要なオブジェクト達
    var gpuCompute = void 0;
    var velocityVariable = void 0;
    var positionVariable = void 0;
    var positionUniforms = void 0;
    var velocityUniforms = void 0;
    var particleUniforms = void 0;
    var effectController = void 0;

    var count = 0;

    var init = function init() {

      // ===== renderer, camera
      container = document.getElementById('canvas');
      camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 5, 15000);
      camera.position.y = 0;
      camera.position.z = 150;
      scene = new THREE.Scene();
      renderer = new THREE.WebGLRenderer();
      renderer.setClearColor(0x000000);
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);
      container.appendChild(renderer.domElement);

      // ===== controls
      controls = new THREE.OrbitControls(camera, renderer.domElement);

      // ===== stats
      stats = new Stats();
      stats.setMode(0);
      stats.domElement.style.position = 'absolute';
      stats.domElement.style.left = '0px';
      stats.domElement.style.top = '0px';
      container.appendChild(stats.domElement);
      // container.appendChild(stats.dom);

      window.addEventListener('resize', onWindowResize, false);
      window.addEventListener('mousemove', onMouseMove, false);
      // window.addEventListener('click', onRestart, false);

      document.onkeydown = function () {
        if (event.keyCode == 13) {
          onRestart();
        }
      };

      // ***** このコメントアウトについては後述 ***** //
      // effectController = {
      //   time: 0.0,
      // };

      // gpuCopute用のRenderを作る
      initComputeRenderer();

      // particle 初期化
      initPosition();

      // uniforms
      particleUniforms.resolution.value.x = renderer.domElement.width;
      particleUniforms.resolution.value.y = renderer.domElement.height;
    };

    // gpuCopute用のRenderを作る
    var initComputeRenderer = function initComputeRenderer() {

      // gpgpuオブジェクトのインスタンスを格納
      gpuCompute = new GPUComputationRenderer(w, w, renderer);

      // 今回はパーティクルの位置情報と、移動方向を保存するテクスチャを2つ用意します
      var dtPosition = gpuCompute.createTexture();
      var dtVelocity = gpuCompute.createTexture();

      // テクスチャにGPUで計算するために初期情報を埋めていく
      fillTextures(dtPosition, dtVelocity);

      // shaderプログラムのアタッチ
      positionVariable = gpuCompute.addVariable('texturePosition', positionFrag, dtPosition);
      velocityVariable = gpuCompute.addVariable('textureVelocity', velocityFrag, dtVelocity);

      // 一連の関係性を構築するためのおまじない
      gpuCompute.setVariableDependencies(velocityVariable, [positionVariable, velocityVariable]);
      gpuCompute.setVariableDependencies(positionVariable, [positionVariable, velocityVariable]);

      // uniform変数を登録したい場合は以下のように作る
      positionUniforms = positionVariable.material.uniforms;
      velocityUniforms = velocityVariable.material.uniforms;

      positionUniforms.time = {
        type: 'f',
        value: 0.0
      };

      velocityUniforms.time = {
        type: 'f',
        value: 0.0
      };

      /*
      ***********************************
      たとえば、上でコメントアウトしているeffectControllerオブジェクトのtimeを
      わたしてあげれば、effectController.timeを更新すればuniform変数も変わったり、ということができる
      velocityUniforms.time = { value: effectController.time };
      ************************************
      */

      var error = gpuCompute.init();
      if (error !== null) {
        console.error(error);
      }
    };

    // restart用関数 今回は使わない
    var restartSimulation = function restartSimulation() {
      var dtPosition = gpuCompute.createTexture();
      var dtVelocity = gpuCompute.createTexture();
      fillTextures(dtPosition, dtVelocity);
      gpuCompute.renderTexture(dtPosition, positionVariable.renderTargets[0]);
      gpuCompute.renderTexture(dtPosition, positionVariable.renderTargets[1]);
      gpuCompute.renderTexture(dtVelocity, velocityVariable.renderTargets[0]);
      gpuCompute.renderTexture(dtVelocity, velocityVariable.renderTargets[1]);
    };

    // パーティクルそのものの情報を決めていく。
    var initPosition = function initPosition() {

      // 最終的に計算された結果を反映するためのオブジェクト。
      // 位置情報はShader側(texturePosition, textureVelocity)
      // で決定されるので、以下のように適当にうめちゃってOK

      geometry = new THREE.BufferGeometry();
      // geometry = new THREE.BoxBufferGeometry(100.0, 100.0, 100.0);

      var positions = new Float32Array(perticles * 3);
      var p1 = 0;
      for (var i = 0; i < perticles; i++) {
        positions[p1++] = 0;
        positions[p1++] = 0;
        positions[p1++] = 0;
      }

      // uv情報の決定。テクスチャから情報を取り出すときに必要
      var uvs = new Float32Array(perticles * 2);
      var p2 = 0;
      for (var j = 0; j < w; j++) {
        for (var _i = 0; _i < w; _i++) {
          uvs[p2++] = _i / (w - 1);
          uvs[p2++] = j / (w - 1);
        }
      }

      // attributeをgeometryに登録する
      geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.addAttribute('uv', new THREE.BufferAttribute(uvs, 2));

      // uniform変数をオブジェクトで定義
      // 今回はカメラをマウスでいじれるように、計算に必要な情報もわたす。
      particleUniforms = {
        texturePosition: {
          value: null
        },
        textureVelocity: {
          value: null
        },
        cameraConstant: {
          value: getCameraConstant(camera)
        },
        resolution: {
          type: 'v2',
          value: new THREE.Vector2()
        },
        mouse: {
          type: 'v2',
          value: new THREE.Vector2()
        },
        time: {
          type: 'f',
          value: 1.0
        }
      };

      // Shaderマテリアル
      // これはパーティクルそのものの描写に必要なシェーダー
      material = new THREE.ShaderMaterial({
        uniforms: particleUniforms,
        vertexShader: perticleVert,
        fragmentShader: perticleFrag,
        wireframe: true
        // side: THREE.DoubleSide
      });

      material.extensions.drawBuffers = true;

      var mesh = new THREE.Points(geometry, material);

      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();

      // パーティクルをシーンに追加
      scene.add(mesh);
    };

    // テクスチャ定義?
    var fillTextures = function fillTextures(texturePosition, textureVelocity) {

      // textureのイメージデータをいったん取り出す
      var posArray = texturePosition.image.data;
      var velArray = textureVelocity.image.data;

      // パーティクルの初期の位置は、ランダムなXZに平面おく。
      // 板状の正方形が描かれる
      for (var k = 0, kl = posArray.length; k < kl; k += 4) {

        var x = void 0,
            y = void 0,
            z = void 0;
        // x = 0.0;
        // y = 0.0;
        // z = 0.0;
        x = Math.random() * 50 - 25;
        y = Math.random() * 50 - 25;
        z = Math.random() * 50 - 25;

        posArray[k + 0] = x;
        posArray[k + 1] = y;
        posArray[k + 2] = z;
        posArray[k + 3] = 0;

        velArray[k + 0] = 0;
        velArray[k + 1] = 0;
        velArray[k + 2] = 0;
        velArray[k + 3] = 0;
      }
    };

    // カメラオブジェクトからシェーダーに渡したい情報を引っ張ってくる関数
    // カメラからパーティクルがどれだけ離れてるかを計算し、パーティクルの大きさを決定するため。
    var getCameraConstant = function getCameraConstant(camera) {
      return window.innerHeight / (Math.tan(THREE.Math.DEG2RAD * 0.5 * camera.fov) / camera.zoom);
    };

    // 画面がリサイズされたときの処理
    // ここでもシェーダー側に情報を渡す。
    var onWindowResize = function onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);

      particleUniforms.resolution.value.x = renderer.domElement.width;
      particleUniforms.resolution.value.y = renderer.domElement.height;

      particleUniforms.cameraConstant.value = getCameraConstant(camera);
    };

    var onMouseMove = function onMouseMove(e) {
      var x = event.clientX * 2.0 - window.innerWidth;
      var y = event.clientY * 2.0 - window.innerHeight;
      x /= window.innerWidth;
      y /= window.innerHeight;
      particleUniforms.mouse.value.x = e.pageX;
      particleUniforms.mouse.value.y = e.pageY;
    };

    var onRestart = function onRestart() {
      console.log('onRestart');

      var dtPosition = gpuCompute.createTexture();
      var dtVelocity = gpuCompute.createTexture();
      var posArray = dtPosition.image.data;
      var velArray = dtVelocity.image.data;

      var tween = new TimelineMax();

      for (var k = 0, kl = posArray.length; k < kl; k += 40) {

        var x = void 0,
            y = void 0,
            z = void 0;
        // x = Math.random() * 500 - 250;
        // y = Math.random() * 500 - 250;
        // z = Math.random() * 500 - 250;
        x = Math.random() * 50 - 25;
        y = Math.random() * 50 - 25;
        z = Math.random() * 50 - 25;

        posArray[k + 0] = x;
        posArray[k + 1] = y;
        posArray[k + 2] = z;
        posArray[k + 3] = 0;

        // velArray[k + 0] = Math.random() * 2.0 - 1.0;
        // velArray[k + 1] = Math.random() * 2.0 - 1.0;
        // velArray[k + 2] = Math.random() * 2.0 - 1.0;
        // velArray[k + 3] = Math.random() * 2.0 - 1.0;
        velArray[k + 0] = Math.random() * 1024.0 - 516;
        velArray[k + 1] = Math.random() * 1024.0 - 516;
        velArray[k + 2] = Math.random() * 1024.0 - 516;
        velArray[k + 3] = Math.random() * 1024.0 - 516;
      }
      gpuCompute.renderTexture(dtPosition, positionVariable.renderTargets[0]);
      gpuCompute.renderTexture(dtPosition, positionVariable.renderTargets[1]);
      gpuCompute.renderTexture(dtVelocity, velocityVariable.renderTargets[0]);
      gpuCompute.renderTexture(dtVelocity, velocityVariable.renderTargets[1]);
    };

    var animate = function animate() {
      render();
      stats.update();
      requestAnimationFrame(animate);
    };

    var render = function render() {

      count++;
      scene.rotation.x = count * 0.005;
      scene.rotation.y = count * 0.005;

      // effectController.time += 0.05;
      // velocityUniforms.time.value = effectController.time;

      particleUniforms.time.value += 0.05;

      positionUniforms.time.value += 0.05;
      velocityUniforms.time.value += 0.05;

      // 計算用のテクスチャを更新
      gpuCompute.compute();

      // 計算した結果が格納されたテクスチャをレンダリング用のシェーダーに渡す
      particleUniforms.texturePosition.value = gpuCompute.getCurrentRenderTarget(positionVariable).texture;
      particleUniforms.textureVelocity.value = gpuCompute.getCurrentRenderTarget(velocityVariable).texture;
      renderer.render(scene, camera);
    };

    init();
    animate();
  }, false);
})();

},{"./../_shader/perticle.frag":1,"./../_shader/perticle.vert":2,"./../_shader/position.frag":3,"./../_shader/velocity.frag":4}]},{},[5]);
