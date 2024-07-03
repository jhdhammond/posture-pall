'use client'
import React, { useEffect, useState, useRef } from 'react'
import { DrawingUtils, FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'

export default function MainPageComponent() {
  const [poseLandmarker, setPoseLandmarker] = useState<PoseLandmarker | undefined>(undefined);
  const [videoRunning, setVideoRunning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const createPoseLandmarker = async () => {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
    );
    setPoseLandmarker(await PoseLandmarker.createFromOptions(vision, {
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

  const activateWebcam = async () => {
    if (!videoRef.current) return;
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoRef.current.srcObject = stream;
    videoRef.current.addEventListener('loadeddata', predictWebcam);
  };

  let lastVideoTime = -1;

  const predictWebcam = async () => {
    if (!poseLandmarker || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext("2d");
    if (!canvasCtx) return;
    const drawingUtils = new DrawingUtils(canvasCtx);

    canvas.style.height = video.style.height = "360px";
    canvas.style.width = video.style.width = "480px";
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    await poseLandmarker.setOptions({ runningMode: "VIDEO" });

    const detect = async () => {
      if (!poseLandmarker || !canvasCtx || !drawingUtils) return;

      let startTimeMs = performance.now();
      if (lastVideoTime !== video.currentTime) {
        lastVideoTime = video.currentTime;
        poseLandmarker.detectForVideo(video, startTimeMs, (result) => {
          canvasCtx.save();
          canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
          for (const landmark of result.landmarks) {
            drawingUtils.drawLandmarks(landmark, {
              radius: (data) => DrawingUtils.lerp(data.from!.z, -0.15, 0.1, 5, 1)
            });
            drawingUtils.drawConnectors(landmark, PoseLandmarker.POSE_CONNECTIONS);
          }
          canvasCtx.restore();
        });
      }

      if (videoRunning) {
        requestAnimationFrame(detect);
      }
    };

    if (videoRunning) {
      detect();
    }
  };

  return (
    <div>
      <div id="liveView" className="videoView">
        <button
          id="webcamButton"
          className="mdc-button mdc-button--raised"
          onClick={() => {
            setVideoRunning(!videoRunning);
            if (!videoRunning) {
              activateWebcam();
            }
          }}
        >
          <span className="mdc-button__ripple"></span>
          <span className="mdc-button__label">{videoRunning ? 'DISABLE WEBCAM' : 'ENABLE WEBCAM'}</span>
        </button>
        <div className='relative'>
          <video ref={videoRef} id="webcam" className="w-[640px] h-[360px] absolute" autoPlay playsInline></video>
          <canvas ref={canvasRef} className="output_canvas w-[640px] h-[360px] absolute left-0 top-0" id="output_canvas"></canvas>
        </div>
      </div>
    </div>
  );
}
