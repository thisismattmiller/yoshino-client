<template>
  <div ref="container" class="logo-container"></div>
</template>

<script>
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { asset } from '../assets.js'

const EXTRUDE_DEPTH = 4
const BEVEL_SIZE = 0.8
const BEVEL_SEGMENTS = 3

function pathToShapes(d) {
  const shapePath = new THREE.ShapePath()
  let cx = 0, cy = 0
  let startX = 0, startY = 0
  let lastCpX = 0, lastCpY = 0
  let lastCmd = ''

  const tokens = d.match(/[a-zA-Z][^a-zA-Z]*/g) || []

  for (const token of tokens) {
    const cmd = token[0]
    const nums = (token.slice(1).match(/-?\d+\.?\d*(?:e[+-]?\d+)?/gi) || []).map(Number)

    switch (cmd) {
      case 'M':
        cx = nums[0]; cy = nums[1]
        shapePath.moveTo(cx, cy)
        startX = cx; startY = cy
        for (let i = 2; i < nums.length; i += 2) {
          cx = nums[i]; cy = nums[i + 1]
          shapePath.currentPath.lineTo(cx, cy)
        }
        break
      case 'm':
        cx += nums[0]; cy += nums[1]
        shapePath.moveTo(cx, cy)
        startX = cx; startY = cy
        for (let i = 2; i < nums.length; i += 2) {
          cx += nums[i]; cy += nums[i + 1]
          shapePath.currentPath.lineTo(cx, cy)
        }
        break
      case 'L':
        for (let i = 0; i < nums.length; i += 2) {
          cx = nums[i]; cy = nums[i + 1]
          shapePath.currentPath.lineTo(cx, cy)
        }
        break
      case 'l':
        for (let i = 0; i < nums.length; i += 2) {
          cx += nums[i]; cy += nums[i + 1]
          shapePath.currentPath.lineTo(cx, cy)
        }
        break
      case 'H':
        for (const n of nums) { cx = n; shapePath.currentPath.lineTo(cx, cy) }
        break
      case 'h':
        for (const n of nums) { cx += n; shapePath.currentPath.lineTo(cx, cy) }
        break
      case 'V':
        for (const n of nums) { cy = n; shapePath.currentPath.lineTo(cx, cy) }
        break
      case 'v':
        for (const n of nums) { cy += n; shapePath.currentPath.lineTo(cx, cy) }
        break
      case 'C':
        for (let i = 0; i < nums.length; i += 6) {
          shapePath.currentPath.bezierCurveTo(
            nums[i], nums[i + 1], nums[i + 2], nums[i + 3], nums[i + 4], nums[i + 5]
          )
          lastCpX = nums[i + 2]; lastCpY = nums[i + 3]
          cx = nums[i + 4]; cy = nums[i + 5]
        }
        break
      case 'c':
        for (let i = 0; i < nums.length; i += 6) {
          shapePath.currentPath.bezierCurveTo(
            cx + nums[i], cy + nums[i + 1], cx + nums[i + 2], cy + nums[i + 3], cx + nums[i + 4], cy + nums[i + 5]
          )
          lastCpX = cx + nums[i + 2]; lastCpY = cy + nums[i + 3]
          cx += nums[i + 4]; cy += nums[i + 5]
        }
        break
      case 'S':
        for (let i = 0; i < nums.length; i += 4) {
          const rx = 2 * cx - lastCpX, ry = 2 * cy - lastCpY
          shapePath.currentPath.bezierCurveTo(rx, ry, nums[i], nums[i + 1], nums[i + 2], nums[i + 3])
          lastCpX = nums[i]; lastCpY = nums[i + 1]
          cx = nums[i + 2]; cy = nums[i + 3]
        }
        break
      case 's':
        for (let i = 0; i < nums.length; i += 4) {
          const rx = 2 * cx - lastCpX, ry = 2 * cy - lastCpY
          shapePath.currentPath.bezierCurveTo(rx, ry, cx + nums[i], cy + nums[i + 1], cx + nums[i + 2], cy + nums[i + 3])
          lastCpX = cx + nums[i]; lastCpY = cy + nums[i + 1]
          cx += nums[i + 2]; cy += nums[i + 3]
        }
        break
      case 'Q':
        for (let i = 0; i < nums.length; i += 4) {
          shapePath.currentPath.quadraticCurveTo(nums[i], nums[i + 1], nums[i + 2], nums[i + 3])
          lastCpX = nums[i]; lastCpY = nums[i + 1]
          cx = nums[i + 2]; cy = nums[i + 3]
        }
        break
      case 'q':
        for (let i = 0; i < nums.length; i += 4) {
          shapePath.currentPath.quadraticCurveTo(cx + nums[i], cy + nums[i + 1], cx + nums[i + 2], cy + nums[i + 3])
          lastCpX = cx + nums[i]; lastCpY = cy + nums[i + 1]
          cx += nums[i + 2]; cy += nums[i + 3]
        }
        break
      case 'Z': case 'z':
        cx = startX; cy = startY
        break
    }
    lastCmd = cmd.toUpperCase()
    if (lastCmd !== 'C' && lastCmd !== 'S') { lastCpX = cx; lastCpY = cy }
  }

  return shapePath.toShapes(true)
}

export default {
  name: 'LogoScene',

  data() {
    return {
      ready: false,
    }
  },

  mounted() {
    this._initScene()
  },

  beforeUnmount() {
    if (this._animFrameId) cancelAnimationFrame(this._animFrameId)
    if (this._onMouseMove) document.removeEventListener('mousemove', this._onMouseMove)
    if (this._renderer) {
      this._renderer.dispose()
    }
  },

  methods: {
    async _initScene() {
      const container = this.$refs.container
      const W = 700, H = 320

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 2000)
      camera.position.set(0, -40, 320)
      camera.lookAt(0, -40, 0)

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      renderer.setSize(W, H)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setClearColor(0xffffff, 0)
      container.appendChild(renderer.domElement)
      this._renderer = renderer

      // Lights — intensities scaled for Three.js r155+ physically-correct lighting
      scene.add(new THREE.AmbientLight(0xffffff, 1.7))

      const key = new THREE.DirectionalLight(0xffffff, 1.4)
      key.position.set(0, 0, 300)
      scene.add(key)

      const fill = new THREE.DirectionalLight(0xffffff, 0.6)
      fill.position.set(-60, 30, 150)
      scene.add(fill)

      const top = new THREE.DirectionalLight(0xffffff, 0.5)
      top.position.set(0, 100, 50)
      scene.add(top)

      // Load & parse SVG
      const resp = await fetch(asset('/logo.svg'))
      const text = await resp.text()
      const parser = new DOMParser()
      const doc = parser.parseFromString(text, 'image/svg+xml')

      const group = new THREE.Group()
      const pathEls = doc.querySelectorAll('path, polygon')

      pathEls.forEach(el => {
        const fillAttr = el.getAttribute('fill') ||
          el.closest('[fill]')?.getAttribute('fill') || '#000000'

        let d
        if (el.tagName === 'polygon') {
          const pts = el.getAttribute('points').trim()
          const coords = pts.split(/[\s,]+/)
          d = `M${coords[0]},${coords[1]}`
          for (let i = 2; i < coords.length; i += 2) {
            d += `L${coords[i]},${coords[i + 1]}`
          }
          d += 'Z'
        } else {
          d = el.getAttribute('d')
        }

        if (!d) return

        const shapes = pathToShapes(d)
        if (!shapes.length) return

        let parsedColor = fillAttr
        if (parsedColor === '#000000' || parsedColor === '#000' || parsedColor === 'black') {
          parsedColor = '#1a1a2e'
        }

        const mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(parsedColor),
          metalness: 0.05,
          roughness: 0.6,
        })

        const geo = new THREE.ExtrudeGeometry(shapes, {
          depth: EXTRUDE_DEPTH,
          bevelEnabled: true,
          bevelThickness: BEVEL_SIZE,
          bevelSize: BEVEL_SIZE,
          bevelSegments: BEVEL_SEGMENTS,
        })

        group.add(new THREE.Mesh(geo, mat))
      })

      // Center the group
      const box = new THREE.Box3().setFromObject(group)
      const center = box.getCenter(new THREE.Vector3())
      group.position.sub(center)
      group.scale.set(1, -1, 1)
      scene.add(group)

      // Load cherry-blossom GLB
      const dracoLoader = new DRACOLoader()
      dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/draco/')

      const gltfLoader = new GLTFLoader()
      gltfLoader.setDRACOLoader(dracoLoader)

      let petalData = null

      gltfLoader.load(asset('/cherry-blossom.glb'), (gltf) => {
        const model = gltf.scene
        const DEG = Math.PI / 180

        const textBox = new THREE.Box3().setFromObject(group)
        const textSize = textBox.getSize(new THREE.Vector3())
        const modelBox = new THREE.Box3().setFromObject(model)
        const modelSize = modelBox.getSize(new THREE.Vector3())
        const targetSize = Math.max(textSize.x, textSize.y) * 1.5
        const maxModelDim = Math.max(modelSize.x, modelSize.y, modelSize.z)
        const baseScale = targetSize / maxModelDim

        scene.add(model)

        model.position.set(125.5, -91.5, 1.5)
        model.rotation.set(-36.5 * DEG, -1.5 * DEG, 16.5 * DEG)
        const s = baseScale * 0.32
        model.scale.set(s, s, s)

        container.classList.add('ready')
        this.ready = true

        // Petal particle system
        const PETAL_COUNT = 24
        const petalOrigin = new THREE.Vector3(125.5, -65, -15)

        const petalCanvas = document.createElement('canvas')
        petalCanvas.width = 32; petalCanvas.height = 32
        const pctx = petalCanvas.getContext('2d')
        pctx.beginPath()
        pctx.ellipse(16, 16, 14, 8, Math.PI * 0.15, 0, Math.PI * 2)
        pctx.fillStyle = '#ffb7c5'
        pctx.fill()
        const grad = pctx.createRadialGradient(16, 16, 0, 16, 16, 16)
        grad.addColorStop(0, 'rgba(255,200,210,0.6)')
        grad.addColorStop(1, 'rgba(255,183,197,0)')
        pctx.fillStyle = grad
        pctx.fillRect(0, 0, 32, 32)
        const petalTexture = new THREE.CanvasTexture(petalCanvas)

        const petalGeo = new THREE.BufferGeometry()
        const positions = new Float32Array(PETAL_COUNT * 3)
        const velocities = []
        const lifetimes = []
        const sizes = new Float32Array(PETAL_COUNT)

        for (let i = 0; i < PETAL_COUNT; i++) {
          positions[i * 3] = petalOrigin.x + (Math.random() - 0.5) * 80
          positions[i * 3 + 1] = petalOrigin.y + (Math.random() - 0.5) * 60
          positions[i * 3 + 2] = petalOrigin.z + (Math.random() - 0.5) * 30

          velocities.push({
            x: 0.15 + Math.random() * 0.25,
            y: -0.03 + (Math.random() - 0.5) * 0.06,
            z: (Math.random() - 0.5) * 0.05,
          })
          lifetimes.push(Math.random() * Math.PI * 2)
          sizes[i] = 30 + Math.random() * 40.0
        }

        petalGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        petalGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

        const petalMat = new THREE.PointsMaterial({
          map: petalTexture,
          size: 50,
          sizeAttenuation: true,
          transparent: true,
          opacity: 0.35,
          depthWrite: false,
          blending: THREE.NormalBlending,
          color: 0xffc0cb,
        })

        const petals = new THREE.Points(petalGeo, petalMat)
        scene.add(petals)

        // Connection lines
        const MAX_CONNECTIONS = 12
        const connections = []

        function spawnConnection() {
          if (connections.length >= MAX_CONNECTIONS) return
          const a = Math.floor(Math.random() * PETAL_COUNT)
          let b = Math.floor(Math.random() * (PETAL_COUNT - 1))
          if (b >= a) b++

          const lineGeo = new THREE.BufferGeometry()
          const linePositions = new Float32Array(6)
          lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3))

          const lineMat = new THREE.LineDashedMaterial({
            color: 0xc4788a,
            transparent: true,
            opacity: 0,
            dashSize: 2,
            gapSize: 1.5,
            depthWrite: false,
          })

          const line = new THREE.Line(lineGeo, lineMat)
          line.computeLineDistances()
          scene.add(line)

          connections.push({
            line, lineGeo, lineMat, linePositions,
            a, b,
            age: 0,
            lifetime: 0.8 + Math.random() * 1.2,
          })
        }

        petalData = { positions, velocities, lifetimes, sizes, petalGeo, petalOrigin, PETAL_COUNT, connections, spawnConnection }
      })

      // Mouse parallax
      const BASE_CAM = { x: 0, y: -40, z: 320 }
      const TILT_AMOUNT = 15
      let mouseTarget = { x: 0, y: 0 }
      let mouseCurrent = { x: 0, y: 0 }

      this._onMouseMove = (e) => {
        mouseTarget.x = (e.clientX / window.innerWidth - 0.5) * 2
        mouseTarget.y = (e.clientY / window.innerHeight - 0.5) * 2
      }
      document.addEventListener('mousemove', this._onMouseMove)

      // Animate
      let time = 0
      const animate = () => {
        this._animFrameId = requestAnimationFrame(animate)
        time += 0.016

        mouseCurrent.x += (mouseTarget.x - mouseCurrent.x) * 0.05
        mouseCurrent.y += (mouseTarget.y - mouseCurrent.y) * 0.05

        camera.position.set(
          BASE_CAM.x + mouseCurrent.x * TILT_AMOUNT,
          BASE_CAM.y - mouseCurrent.y * TILT_AMOUNT,
          BASE_CAM.z
        )
        camera.lookAt(0, -40, 0)

        if (petalData) {
          const pos = petalData.positions
          const dt = 0.016

          for (let i = 0; i < petalData.PETAL_COUNT; i++) {
            const v = petalData.velocities[i]
            const phase = petalData.lifetimes[i]
            const i3 = i * 3

            pos[i3] += v.x
            pos[i3 + 1] += v.y + Math.sin(time * 1.5 + phase) * 0.04
            pos[i3 + 2] += v.z + Math.cos(time * 1.2 + phase) * 0.02

            if (pos[i3] > petalData.petalOrigin.x + 120) {
              pos[i3] = petalData.petalOrigin.x + (Math.random() - 0.5) * 80
              pos[i3 + 1] = petalData.petalOrigin.y + (Math.random() - 0.5) * 60
              pos[i3 + 2] = petalData.petalOrigin.z + (Math.random() - 0.5) * 30
            }
          }
          petalData.petalGeo.attributes.position.needsUpdate = true

          if (Math.random() < 0.15) petalData.spawnConnection()

          const conns = petalData.connections
          for (let c = conns.length - 1; c >= 0; c--) {
            const conn = conns[c]
            conn.age += dt

            const a3 = conn.a * 3, b3 = conn.b * 3
            conn.linePositions[0] = pos[a3]
            conn.linePositions[1] = pos[a3 + 1]
            conn.linePositions[2] = pos[a3 + 2]
            conn.linePositions[3] = pos[b3]
            conn.linePositions[4] = pos[b3 + 1]
            conn.linePositions[5] = pos[b3 + 2]
            conn.lineGeo.attributes.position.needsUpdate = true
            conn.line.computeLineDistances()

            const t = conn.age / conn.lifetime
            if (t < 0.2) {
              conn.lineMat.opacity = (t / 0.2) * 0.45
            } else if (t < 0.6) {
              conn.lineMat.opacity = 0.45
            } else if (t < 1.0) {
              conn.lineMat.opacity = (1.0 - t) / 0.4 * 0.45
            } else {
              scene.remove(conn.line)
              conn.lineGeo.dispose()
              conn.lineMat.dispose()
              conns.splice(c, 1)
            }
          }
        }

        renderer.render(scene, camera)
      }
      animate()
    },
  },
}
</script>

<style scoped>
.logo-container {
  width: 700px;
  height: 320px;
  position: relative;
  opacity: 0;
  transition: opacity 0.4s ease;
}
.logo-container.ready {
  opacity: 1;
}
.logo-container canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
