import React, { useRef } from 'react';
import "./minimap.scss";
import { Options } from 'modern-screenshot/worker?url'
import { domToPng } from 'modern-screenshot'
import { motion } from 'framer-motion';
import { update } from 'lodash';
import { TiptapCollabProvider } from '@hocuspocus/provider';

export const Minimap = (props: { provider: TiptapCollabProvider }) => {
  const win = window;
  const doc = document;
  const body = doc.body;

  const sliderRef = useRef<HTMLDivElement>(null);
  const sliderContentRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<HTMLDivElement>(null);
  const sliderSizeRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState<number>(0.1)
  let realScale = scale;
  let mouseDown = false;
  let mouseX = 0;
  let mouseY = 0;

  // Capture the webpage and place it into the minimap content
  const updateMinimapContent = () => {
    // This will update the dimensions of the minimap based off the dimensions of the page
    getDimensions();

    let options: Options = {
      features: {
        removeControlCharacter: false
      },
    }

    try {
      domToPng(window.document.body, options).then((dataURL: string) => {
        // Create an image from the canvas
        var img = new Image();
        img.src = dataURL;

        const sliderContent = sliderContentRef.current

        if (sliderContent) {
          // Get the existing image in the minimap, if any
          const existingImg = sliderContent.querySelector('img');

          if (existingImg) {
            // If an image already exists, replace it with the new image
            existingImg.replaceWith(img);
          } else {
            // If no image exists, append the new image
            sliderContent.appendChild(img);
          }
        }
      });
    } catch (err) {
      console.error("Error occurred while trying to render a screenshot of the page for the Minimap:", err)
    }
  }

    const getDimensions = () => {
      const bodyWidth = body.clientWidth;
      const bodyRatio = body.clientHeight / bodyWidth;
      const winRatio = win.innerHeight / win.innerWidth;

      if (sliderRef.current && sliderSizeRef.current && controllerRef.current && sliderContentRef.current) {
        sliderRef.current.style.width = (scale * 100) + '%';
        realScale = sliderRef.current.clientWidth / bodyWidth;

        sliderSizeRef.current.style.paddingTop = (bodyRatio * 100) + '%';
        controllerRef.current.style.paddingTop = (winRatio * 100) + '%';

        sliderContentRef.current.style.transform = 'scale(' + realScale + ')';
        sliderContentRef.current.style.width = (100 / realScale) + '%';
        sliderContentRef.current.style.height = (100 / realScale) + '%';
      }
    }

  // Only update the minimap once when the webpage has loaded
  // Minimap causes UI thread blocking every time it's updating
  // React.useEffect(() => {
  //     setTimeout(updateMinimapContent, 2000)
  // }, [])

  props.provider.on("synced", () => {
    updateMinimapContent()
    console.log("synced!")
  })

  // Only initialise once upon app initialisation, and destroy when component is removed
  React.useEffect(() => {
    function trackScroll() {
      if (controllerRef.current) {
        controllerRef.current.style.transform = 'translate(' +
          ((win.pageXOffset * realScale)) + 'px, ' +
          ((win.pageYOffset * realScale)) + 'px)';
      }
    }

    function pointerDown(e: MouseEvent | TouchEvent) {
      e.preventDefault();
      mouseDown = true;
      mouseX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      mouseY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      if (sliderRef.current && controllerRef.current) {
        const offsetX = ((mouseX - sliderRef.current.offsetLeft) - (controllerRef.current.clientWidth / 2)) / realScale;
        const offsetY = ((mouseY - sliderRef.current.offsetTop) - (controllerRef.current.clientHeight / 2)) / realScale;

        win.scrollTo(offsetX, offsetY);
      }
    }

    function pointerMove(e: MouseEvent | TouchEvent) {
      if (mouseDown) {
        e.preventDefault();

        const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const y = 'touches' in e ? e.touches[0].clientY : e.clientY;

        win.scrollBy((x - mouseX) / realScale, ((y - mouseY) / realScale));
        mouseX = x;
        mouseY = y;
      }
    }

    function pointerReset(e: MouseEvent | TouchEvent) {
      mouseDown = false;
    }

    function pointerLeave(e: MouseEvent | TouchEvent) {
      if (e.target === body) {
        mouseDown = false;
      }
    }

    win.addEventListener('resize', getDimensions);
    win.addEventListener('load', getDimensions);
    win.addEventListener('scroll', trackScroll);
    sliderRef.current?.addEventListener('mousedown', pointerDown);
    sliderRef.current?.addEventListener('touchstart', pointerDown);
    win.addEventListener('mousemove', pointerMove);
    win.addEventListener('touchmove', pointerMove);
    win.addEventListener('mouseup', pointerReset);
    win.addEventListener('touchend', pointerReset);
    body.addEventListener('mouseleave', pointerLeave);
    // body.addEventListener('touchleave', pointerLeave);

    return () => {
      win.removeEventListener('resize', getDimensions);
      win.removeEventListener('load', getDimensions);
      win.removeEventListener('scroll', trackScroll);
      sliderRef.current?.removeEventListener('mousedown', pointerDown);
      sliderRef.current?.removeEventListener('touchstart', pointerDown);
      win.removeEventListener('mousemove', pointerMove);
      win.removeEventListener('touchmove', pointerMove);
      win.removeEventListener('mouseup', pointerReset);
      win.removeEventListener('touchend', pointerReset);
      body.removeEventListener('mouseleave', pointerLeave);
      // body.removeEventListener('touchleave', pointerLeave);
    };
  }, [])

  return (
    // The effect is to have components fade in one by one, which creates a visual sense of momentum, even though loading is slow
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.7 }} transition={{ duration: 0.5 }} whileHover={{ opacity: 1 }} className="slider" ref={sliderRef}>
      <div className="slider__size" ref={sliderSizeRef}></div>
      <motion.div className="slider__controller" ref={controllerRef}></motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="slider__content" ref={sliderContentRef}></motion.div>
    </motion.div>
  );
};
