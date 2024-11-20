import React, { useEffect, useRef, useState } from 'react';
import "./minimap.scss";
// @ts-ignore
import { domToPng } from 'modern-screenshot'
import { motion } from 'framer-motion';

export const Minimap = () => {
  const [counter, setCounter] = React.useState(0);
  const [minimapWidth, setMinimapWidth] = useState(0);

  const sliderRef = useRef<HTMLDivElement>(null);
  const sliderContentRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<HTMLDivElement>(null);
  const sliderSizeRef = useRef<HTMLDivElement>(null);
  let scale = 0.1;
  let realScale = scale;
  let mouseDown = false;
  let mouseX = 0;
  let mouseY = 0;

  useEffect(() => {
    let timer: NodeJS.Timer | undefined;
    timer = setInterval(() => {
      // Update the minimap every 10 seconds
      setCounter(counter + 1)
    }, 10000);


    const win = window;
    const doc = document;
    const body = doc.body;

    // Capture the webpage and place it into the minimap content
    const updateMinimapContent = () => {
      let options = {
        features: {
          removeControlCharacter: false
        }
      }
      domToPng(window.document.body, options).then((dataURL: string) => {
        // Create an image from the canvas
        var img = new Image();
        img.src = dataURL;

        // Get the document of the iframe
        const sliderContent = sliderContentRef.current

        if (sliderContent) {
          // Get the existing image in the iframe, if any
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
    }

    updateMinimapContent()

    function getDimensions() {
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
      if (sliderRef.current) {
        setMinimapWidth(sliderRef.current.clientWidth);
      }
    }

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

    getDimensions();
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
      clearTimeout(timer);  // Clean up the timer
    };
  }, [counter]);

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 0.7 }} 
      transition={{ duration: 0.5 }} 
      whileHover={{ opacity: 1 }} 
      className="slider" 
      ref={sliderRef}
      style={{ position: 'fixed', top: 0, right: 0, zIndex: 1000 }} // Add this line
    >
      <div className="slider__size" ref={sliderSizeRef}></div>
      <motion.div className="slider__controller" ref={controllerRef}></motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="slider__content" ref={sliderContentRef}></motion.div>
    </motion.div>
  );
};

export const useMinimapWidth = () => {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const slider = document.querySelector('.slider');
    if (slider) {
      setWidth(slider.clientWidth);
    }
    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });
    if (slider) observer.observe(slider);
    return () => {
      if (slider) observer.unobserve(slider);
    };
  }, []);
  return width;
};