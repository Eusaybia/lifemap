import React from 'react'
import { Canvas } from '@react-three/fiber'
import { Text } from '@react-three/drei'

interface ThreeDTextProps {
  text: string
}

const ThreeDText: React.FC<ThreeDTextProps> = ({ text }) => {
  return (
    <Canvas shadows>
      <ambientLight />
      <pointLight position={[10, 10, 10]} castShadow />
      <Text
        position={[0, 0, 0]}
        font="https://fonts.gstatic.com/s/inter/v2/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7.woff"
        fontSize={1}
        color="black"
        receiveShadow
        {...({ depth: 0.5 } as any)}
      >
        {text}
      </Text>
    </Canvas>
  )
}

export default ThreeDText
