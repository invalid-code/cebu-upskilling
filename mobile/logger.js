const TAG = '[Upskilling]';

function isDev() {
  return typeof __DEV__ !== 'undefined' && __DEV__;
}

export const logger = {
  debug: (...args) => {
    if (isDev()) console.debug(TAG, ...args);
  },
  info: (...args) => {
    if (isDev()) console.log(TAG, ...args);
  },
  warn: (...args) => console.warn(TAG, ...args),
  error: (...args) => console.error(TAG, ...args),
};