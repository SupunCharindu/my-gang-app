import { ImageResponse } from 'next/og'

// මේකෙන් කියන්නේ මේක Edge Server එකේ දුවන්න කියලා (Error එන්නේ නෑ)
export const runtime = 'edge'

// Icon Size
export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

// Code වලින් Icon එක අඳිනවා
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 20,
          background: 'linear-gradient(to bottom right, #2563eb, #9333ea)', // නිල්-දම් පාට
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          borderRadius: '8px',
          fontWeight: 800,
        }}
      >
        G
      </div>
    ),
    { ...size }
  )
}