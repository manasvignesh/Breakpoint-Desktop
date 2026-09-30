import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, RotateCcw, FastForward, Loader2, AlertCircle } from 'lucide-react';
import type { AudioTrack } from '../types/domain';

interface AudioPlayerProps {
  audioTrack: AudioTrack;
  title: string;
  initialPositionSeconds?: number;
  onAudioCheckpoint?: (positionSeconds: number, durationSeconds: number) => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioTrack,
  title,
  initialPositionSeconds = 0,
  onAudioCheckpoint,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [hasResumed, setHasResumed] = useState(false);

  const checkpointCallbackRef = useRef(onAudioCheckpoint);
  checkpointCallbackRef.current = onAudioCheckpoint;

  const performCheckpoint = useCallback((time: number, dur: number) => {
    if (dur > 0 && checkpointCallbackRef.current) {
      checkpointCallbackRef.current(Math.floor(time), Math.floor(dur));
    }
  }, []);

  useEffect(() => {
    // Reset state on track change
    setIsPlaying(false);
    setCurrentTime(0);
    setHasResumed(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [audioTrack.audioUrl]);

  // Periodic checkpoint while playing (every 10s)
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      if (audioRef.current) {
        performCheckpoint(audioRef.current.currentTime, audioRef.current.duration);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [isPlaying, performCheckpoint]);

  // Flush checkpoint on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current && audioRef.current.currentTime > 0) {
        performCheckpoint(audioRef.current.currentTime, audioRef.current.duration);
      }
    };
  }, [performCheckpoint]);

  const status = audioTrack.status || (audioTrack.isAvailable && audioTrack.audioUrl ? 'ready' : 'unavailable');

  if (status === 'processing' || status === 'pending') {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-[#12141A] border border-[#232734] rounded-xl text-[#8B949E] text-xs">
        <Loader2 className="w-4 h-4 text-[#FF5A1F] animate-spin" />
        <span>Audio narration in <strong>{audioTrack.language.toUpperCase()}</strong> is generating high-fidelity synthesis...</span>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-[#12141A] border border-red-500/20 rounded-xl text-red-400 text-xs">
        <AlertCircle className="w-4 h-4" />
        <span>Audio narration generation failed for {audioTrack.language.toUpperCase()}. Reading mode available.</span>
      </div>
    );
  }

  if (!audioTrack.isAvailable || !audioTrack.audioUrl) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-[#12141A] border border-[#232734] rounded-xl text-[#8B949E] text-xs">
        <Volume2 className="w-4 h-4 opacity-50" />
        <span>Audio narration in {audioTrack.language.toUpperCase()} is not yet available.</span>
      </div>
    );
  }

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      performCheckpoint(audioRef.current.currentTime, audioRef.current.duration);
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      performCheckpoint(time, audioRef.current.duration);
    }
  };

  const handleResumeClick = () => {
    if (audioRef.current && initialPositionSeconds > 0) {
      audioRef.current.currentTime = initialPositionSeconds;
      setCurrentTime(initialPositionSeconds);
      setHasResumed(true);
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const cycleSpeed = () => {
    const speeds = [1, 1.25, 1.5, 2];
    const nextIndex = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const nextSpeed = speeds[nextIndex];
    setPlaybackRate(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const skipBack = () => {
    if (audioRef.current) {
      const nextTime = Math.max(0, audioRef.current.currentTime - 10);
      audioRef.current.currentTime = nextTime;
      setCurrentTime(nextTime);
      performCheckpoint(nextTime, audioRef.current.duration);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const showResumeOffer =
    !hasResumed &&
    !isPlaying &&
    initialPositionSeconds > 5 &&
    currentTime < 5 &&
    duration > 0 &&
    initialPositionSeconds < duration - 5;

  return (
    <div className="flex flex-col gap-2 p-3.5 bg-gradient-to-r from-[#181B22] to-[#12141A] border border-[#FF5A1F]/30 rounded-2xl shadow-lg shadow-black/40">
      <audio
        ref={audioRef}
        src={audioTrack.audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => {
          setIsPlaying(false);
          if (audioRef.current) {
            performCheckpoint(audioRef.current.duration, audioRef.current.duration);
          }
        }}
      />

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full bg-[#FF5A1F] animate-pulse" />
          <span className="text-xs font-semibold text-[#FF5A1F] uppercase tracking-wider">
            Breakpoint Narration ({audioTrack.language.toUpperCase()})
          </span>
          <span className="text-xs text-[#8B949E] truncate hidden sm:inline">
            · {title}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {showResumeOffer && (
            <button
              onClick={handleResumeClick}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-[#FF5A1F]/20 text-[#FF5A1F] hover:bg-[#FF5A1F]/30 border border-[#FF5A1F]/40 transition flex items-center gap-1.5 animate-fadeIn"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span>Resume from {formatTime(initialPositionSeconds)}</span>
            </button>
          )}

          <button
            onClick={cycleSpeed}
            className="px-2 py-0.5 text-[11px] font-mono font-medium rounded-md bg-[#232734] hover:bg-[#2F3446] text-[#F0F3F6] transition"
            title="Change playback speed"
          >
            {playbackRate}x
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#FF5A1F] hover:bg-[#FF7A45] text-white shadow-md shadow-[#FF5A1F]/20 transition shrink-0"
          aria-label={isPlaying ? 'Pause narration' : 'Play narration'}
        >
          {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
        </button>

        <button
          onClick={skipBack}
          className="p-2 text-[#8B949E] hover:text-[#F0F3F6] transition shrink-0"
          title="Rewind 10 seconds"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <div className="flex-1 flex flex-col gap-1">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-[#232734] rounded-lg appearance-none cursor-pointer accent-[#FF5A1F]"
          />
          <div className="flex justify-between text-[11px] font-mono text-[#8B949E]">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
