import { Extension } from '@tiptap/core'

// TODO: Make it so that text fades in too
export const FadeIn = Extension.create({
  name: 'fadeIn',

  addNodeView() {
    return {
      onMount: ({ dom }: any ) => {
        dom.style.opacity = '0'
        dom.style.transition = 'opacity 0.75s'
        setTimeout(() => {
          dom.style.opacity = '1'
        }, 0)
      },
    }
  },
})