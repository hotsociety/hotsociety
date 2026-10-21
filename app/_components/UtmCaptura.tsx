"use client";

import { useEffect } from "react";
import { capturarUtm } from "../_lib/utm";

// Guarda os UTMs do link do anúncio assim que a pessoa entra em qualquer página.
export default function UtmCaptura() {
  useEffect(() => {
    capturarUtm(window.location.search);
  }, []);
  return null;
}
