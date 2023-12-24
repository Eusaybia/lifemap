import React, { useEffect, useRef } from 'react';
import "./minimap.scss";
// @ts-ignore
import domtoimage from 'dom-to-image';

export const Minimap = () => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const sliderContentRef = useRef<HTMLIFrameElement>(null);
  const controllerRef = useRef<HTMLDivElement>(null);
  const sliderSizeRef = useRef<HTMLDivElement>(null);
  let scale = 0.1;
  let realScale = scale;
  let mouseDown = false;
  let mouseX = 0;
  let mouseY = 0;

  useEffect(() => {
    const win = window;
    const doc = document;
    const body = doc.body;

    // Capture the webpage with html2canvas
    domtoimage.toPng(body).then((dataURL: string) => {
      // Create an image from the canvas
      var img = new Image();
      img.src = dataURL;

      // Get the document of the iframe
      const iframeDoc = sliderContentRef.current?.contentWindow?.document;

      if (iframeDoc) {
        // Get the existing image in the iframe, if any
        const existingImg = iframeDoc.querySelector('img');

        if (existingImg) {
          // If an image already exists, replace it with the new image
          existingImg.replaceWith(img);
        } else {
          // If no image exists, append the new image
          iframeDoc.body.appendChild(img);
        }
      }
    });

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
    };
  }, []);

  return (
    <div className="slider" ref={sliderRef}>
      <div className="slider__size" ref={sliderSizeRef}></div>
      <div className="slider__controller" ref={controllerRef}></div>
      <iframe className="slider__content" ref={sliderContentRef}></iframe>
    </div>
  );
};
