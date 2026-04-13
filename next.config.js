const path = require('path')

module.exports = {
  env: {
    PUBLIC_URL: ''
  },
  experimental: {
    craCompat: false,
  },
  // Remove this to leverage Next.js' static image handling
  // read more here: https://nextjs.org/docs/api-reference/next/image
  images: {
    disableStaticImages: true
  },
  compiler: {
    // removeConsole: { exclude: ['error'] },
  },
  webpack: (config) => {
    config.resolve = config.resolve || {}
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@huggingface/transformers$': path.resolve(__dirname, 'node_modules/@huggingface/transformers/dist/transformers.web.js'),
      'onnxruntime-node$': false,
      'sharp$': false,
    }
    return config
  },
}
