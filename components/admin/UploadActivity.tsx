"use client";
import { createContext } from "react";
export const UploadActivity = createContext<(delta: number) => void>(() => {});
