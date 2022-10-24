import { ComponentType, useEffect, useState } from "react";
import { Platform } from "react-native";
import { Config } from "tailwindcss";
import { NativeWindStyleSheet } from "./style-sheet";

interface ExpoSnackConfig extends Config {
  compileUrl?: string;
}

export function withExpoSnack(
  Component: ComponentType,
  config?: ExpoSnackConfig,
  css?: string
) {
  return () => {
    const [loaded, setLoaded] = useState(Platform.OS !== "web");

    useEffect(() => {
      if (Platform.OS === "web") {
        if (document.querySelectorAll("#nativewind_cdn").length > 0) {
          setLoaded(true);
          return;
        }

        const head = document.querySelectorAll("head")[0];
        const playCDN = document.createElement("script");
        playCDN.id = "nativewind_cdn";
        playCDN.type = "text/javascript";
        playCDN.src = "https://cdn.tailwindcss.com";
        playCDN.addEventListener("load", () => setLoaded(true));
        head.append(playCDN);

        const configScript = document.createElement("script");
        configScript.id = "nativewind_config";
        configScript.type = "text/javascript";
        head.append(configScript);

        const cssStyle = document.createElement("style");
        cssStyle.id = "nativewind_css";
        cssStyle.type = "text/tailwindcss";
        head.append(cssStyle);
      }
    }, []);

    useEffect(() => {
      if (loaded && Platform.OS === "web" && config) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).tailwind.config = config;
      }
    }, [loaded, config]);

    useEffect(() => {
      if (loaded && Platform.OS === "web" && css) {
        const cssStyle = document.querySelectorAll(
          "#nativewind_css"
        )[0] as HTMLStyleElement;
        cssStyle.replaceChildren(document.createTextNode(css));
      }
    }, [loaded, css]);

    if (Platform.OS !== "web") {
      NativeWindStyleSheet.__dangerouslyCompileStyles((className) => {
        return styleFetcher(className, config, css);
      });
    }

    return loaded ? <Component /> : undefined;
  };
}

let styleFetcherTimer: NodeJS.Timeout;
let pendingClassNames = "";
const styleFetcher = (
  className: string,
  { compileUrl, ...config }: Partial<ExpoSnackConfig> = {},
  css = "",
  timeout = 300
) => {
  clearTimeout(styleFetcherTimer);

  pendingClassNames = pendingClassNames
    ? `${pendingClassNames} ${className}`
    : className;

  styleFetcherTimer = setTimeout(() => {
    let url =
      compileUrl ??
      `https://nativewind-demo-compiler.vercel.app/api/compile?className=${pendingClassNames}`;

    pendingClassNames = "";

    if (css) url = `${url}&css=${css}`;
    if (config) {
      url = `${url}&config=${encodeURIComponent(JSON.stringify(config))}`;
    }

    fetch(url)
      .then((response) => response.json())
      .then((response) => {
        console.log(response);
        NativeWindStyleSheet.create(response);
      })
      .catch((error) => {
        console.error(error);
      });
  }, timeout);
};
