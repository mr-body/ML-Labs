'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import * as poseDetection from '@tensorflow-models/pose-detection';

export default function PoseDetectionPage() {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const animationFrameId = useRef<number | null>(null);

    const [status, setStatus] = useState<string>('Carregando modelo e webcam...');
    const [isReady, setIsReady] = useState<boolean>(false);

    useEffect(() => {
        let detector: poseDetection.PoseDetector | null = null;
        let isMounted = true;

        async function setupCamera(): Promise<HTMLVideoElement> {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480 },
                audio: false,
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await new Promise<void>((resolve) => {
                    if (videoRef.current) {
                        videoRef.current.onloadedmetadata = () => resolve();
                    }
                });
            }

            return videoRef.current!;
        }

        async function initDetector(): Promise<poseDetection.PoseDetector> {
            await tf.ready();
            const model = poseDetection.SupportedModels.MoveNet;
            const detectorConfig: poseDetection.MoveNetModelConfig = {
                modelType: poseDetection.movenet.modelType.SINGLE_POSE_LIGHTNING,
            };

            return await poseDetection.createDetector(model, detectorConfig);
        }

        function drawKeypoints(
            keypoints: poseDetection.Keypoint[],
            ctx: CanvasRenderingContext2D
        ) {
            keypoints.forEach((kp) => {
                if (kp.score && kp.score > 0.4) {
                    ctx.beginPath();
                    ctx.arc(kp.x, kp.y, 5, 0, 2 * Math.PI);
                    ctx.fillStyle = '#00ff00';
                    ctx.fill();
                }
            });
        }

        function drawSkeleton(
            keypoints: poseDetection.Keypoint[],
            ctx: CanvasRenderingContext2D
        ) {
            const adjacentPairs = poseDetection.util.getAdjacentPairs(
                poseDetection.SupportedModels.MoveNet
            );

            adjacentPairs.forEach(([i, j]) => {
                const kp1 = keypoints[i];
                const kp2 = keypoints[j];

                if (kp1.score && kp2.score && kp1.score > 0.4 && kp2.score > 0.4) {
                    ctx.beginPath();
                    ctx.moveTo(kp1.x, kp1.y);
                    ctx.lineTo(kp2.x, kp2.y);
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = '#00ff00';
                    ctx.stroke();
                }
            });
        }

        async function renderLoop() {
            if (
                !isMounted ||
                !videoRef.current ||
                !canvasRef.current ||
                !detector
            ) {
                return;
            }

            const video = videoRef.current;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');

            if (ctx && video.readyState >= 2) {
                const poses = await detector.estimatePoses(video);

                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                if (poses && poses.length > 0) {
                    const keypoints = poses[0].keypoints;
                    drawKeypoints(keypoints, ctx);
                    drawSkeleton(keypoints, ctx);
                }
            }

            animationFrameId.current = requestAnimationFrame(renderLoop);
        }

        async function start() {
            try {
                await setupCamera();
                if (videoRef.current) {
                    await videoRef.current.play();
                }

                detector = await initDetector();

                if (isMounted) {
                    setStatus('Modelo carregado com sucesso! Detectando...');
                    setIsReady(true);
                    renderLoop();
                }
            } catch (error) {
                console.error(error);
                if (isMounted) {
                    setStatus(
                        'Erro ao acessar a webcam ou inicializar o TensorFlow. Verifique as permissões.'
                    );
                }
            }
        }

        start();

        // Cleanup ao desmontar o componente
        return () => {
            isMounted = false;
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
            if (detector) {
                detector.dispose();
            }
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach((track) => track.stop());
            }
        };
    }, []);

    return (
        <div style={{ textAlign: 'center', padding: '20px', fontFamily: 'sans-serif' }}>
            <h1>Detecção de Pose no Next.js (MoveNet)</h1>
            <p style={{ color: isReady ? '#5cb85c' : '#d9534f', fontWeight: 'bold' }}>
                {status}
            </p>

            <div
                style={{
                    position: 'relative',
                    display: 'inline-block',
                    width: 640,
                    height: 480,
                    borderRadius: 8,
                    overflow: 'hidden',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                    backgroundColor: '#000',
                }}
            >
                <video
                    ref={videoRef}
                    playsInline
                    muted
                    width={640}
                    height={480}
                    style={{ position: 'absolute', top: 0, left: 0, opacity: 0 }}
                />
                <canvas
                    ref={canvasRef}
                    width={640}
                    height={480}
                    style={{ position: 'absolute', top: 0, left: 0 }}
                />
            </div>
        </div>
    );
}