'use client'
import React, { useEffect, useState } from 'react'
import { DrawingUtils, FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'

export default function MainPageComponent() {
    const [poseLandmarker, setPostLandmarker] = useState<PoseLandmarker | undefined>(undefined);
    const [videoRunning, setVideoRunning] = useState(false);

    const createPoseLandmarker = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
      );
       setPostLandmarker( await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
          delegate: "GPU"
        },
        runningMode: 'VIDEO',
        numPoses: 2
      }));
    };

    useEffect(() => {
    createPoseLandmarker();
    }, []);


  const doSomething = async () => {
    const vision = await FilesetResolver.forVisionTasks(
      // path/to/wasm/root
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );
  }

  const activateWebcam = async () => {
    const webcam = document.getElementById("webcam") as HTMLVideoElement;
      webcam.srcObject = await navigator.mediaDevices.getUserMedia({ video: true });
      predictWebcam();
  }

  const video = document.getElementById("webcam") as HTMLVideoElement;
  const canvasElement = document.getElementById(
    "output_canvas"
  ) as HTMLCanvasElement;
  const canvasCtx = canvasElement ? canvasElement.getContext("2d") : null;
  const drawingUtils = canvasCtx ? new DrawingUtils(canvasCtx) : null;
  let lastVideoTime = -1;

  const predictWebcam = async () => {
    if (!poseLandmarker || !canvasCtx || !drawingUtils) return
    // Now let's start detecting the stream.
   await poseLandmarker.setOptions({ runningMode: "VIDEO" });
    let startTimeMs = performance.now();
    if (lastVideoTime !== video.currentTime) {
      lastVideoTime = video.currentTime;
      poseLandmarker.detectForVideo(video, startTimeMs, (result) => {
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        for (const landmark of result.landmarks) {
          drawingUtils.drawLandmarks(landmark, {
            radius: (data) => DrawingUtils.lerp(data.from!.z, -0.15, 0.1, 5, 1)
          });
          drawingUtils.drawConnectors(landmark, PoseLandmarker.POSE_CONNECTIONS);
        }
        canvasCtx.restore();
      });
    }
  
    // Call this function again to keep predicting when the browser is ready.
    if (videoRunning === true) {
      window.requestAnimationFrame(predictWebcam);
    }
  }
  

  return (
    <div>

      <div id="liveView" className="videoView">
      <button id="webcamButton" className="mdc-button mdc-button--raised"
        onClick={() => activateWebcam()}
      >
        <span className="mdc-button__ripple"></span>
        <span className="mdc-button__label">ENABLE WEBCAM</span>
      </button>
      <div className='relative'>
        <video id="webcam" className="w-[640px] h-[360px] absolute" autoPlay playsInline></video>
        <canvas className="output_canvas w-[640px] h-[360px] absolute left-0 top-0" id="output_canvas"></canvas>
      </div>
    </div>
    </div>
  )
}
  