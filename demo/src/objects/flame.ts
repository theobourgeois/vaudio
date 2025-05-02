import { AudioUtils } from '@vaudio/utils'
import { createVisualizerObject } from '@vaudio/core'
import * as THREE from 'three'
import { withReact } from '@vaudio/react'
// note: install three/examples via your bundler
import { Water } from 'three/examples/jsm/objects/Water.js'

export const WaterSurface = withReact(
  createVisualizerObject()
    .defaults(() => ({
      size: 30,               // plane width/height
      segments: 256,              // subdivisions
      waterColor: '#001e0f',        // base tint
      flowX: 1.0,              // normal flow vector
      flowY: 1.0,
      scale: 1.0,              // normal map scale
      textureWidth: 1024,             // render target size
      textureHeight: 1024,
      distortionAmp: 3.0,              // base distortion strength
      audioAmp: 1.5,              // extra audio-driven chop
      alpha: 0.5,
      sunColor: "#001e0f",
      distortionScale: 1.0,
      fog: true,
    }))
    .createObject(({ props }) => {
      // build a horizontal plane
      const geo = new THREE.PlaneGeometry(
        props.size,
        props.size,
        props.segments,
        props.segments
      )
      geo.rotateX(-Math.PI / 2)

      // set up the Three.js Water object
      const water = new Water(geo, {
        sunColor: props.sunColor,
        waterColor: props.waterColor,
        textureWidth: props.textureWidth,
        textureHeight: props.textureHeight,
        distortionScale: props.distortionAmp,
        alpha: props.alpha,
        fog: props.fog,
      })

      return water
    })
    .render(({ mesh, delta, audioData, props }) => {
      // advance the internal simulation
      mesh.material.uniforms['time'].value += delta

      // extra audio-driven chop on top of base distortion
      const rms = AudioUtils.getRMS(audioData)
      mesh.material.uniforms['distortionScale'].value =
        props.distortionAmp * (1 + rms * props.audioAmp)
    })
)
