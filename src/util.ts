import hash from '@emotion/hash';
import devWarning from 'rc-util/lib/warning';
import { updateCSS, removeCSS } from 'rc-util/lib/Dom/dynamicCSS';
import canUseDom from 'rc-util/lib/Dom/canUseDom';

export function flattenToken(token: any) {
  let str = '';
  Object.keys(token).forEach((key) => {
    const value = token[key];
    str += key;
    if (value && typeof value === 'object') {
      str += flattenToken(value);
    } else {
      str += value;
    }
  });
  return str;
}

/**
 * Convert derivative token to key string
 */
export function token2key(token: any, slat: string): string {
  return hash(`${slat}_${flattenToken(token)}`);
}

export function warning(message: string, path?: string) {
  devWarning(
    false,
    `[Ant Design CSS-in-JS] ${path ? `Error in '${path}': ` : ''}${message}`,
  );
}

export const styleValidate = (
  key: string,
  value: string | number | boolean | null | undefined,
  info: {
    path?: string;
    hashId?: string;
  } = {},
) => {
  const { path, hashId } = info;
  switch (key) {
    case 'content':
      // From emotion: https://github.com/emotion-js/emotion/blob/main/packages/serialize/src/index.js#L63
      const contentValuePattern =
        /(attr|counters?|url|(((repeating-)?(linear|radial))|conic)-gradient)\(|(no-)?(open|close)-quote/;
      const contentValues = ['normal', 'none', 'initial', 'inherit', 'unset'];
      if (
        typeof value !== 'string' ||
        (contentValues.indexOf(value) === -1 &&
          !contentValuePattern.test(value) &&
          (value.charAt(0) !== value.charAt(value.length - 1) ||
            (value.charAt(0) !== '"' && value.charAt(0) !== "'")))
      ) {
        warning(
          `You seem to be using a value for 'content' without quotes, try replacing it with \`content: '"${value}"'\``,
          path,
        );
      }
      return;
    case 'marginLeft':
    case 'marginRight':
    case 'paddingLeft':
    case 'paddingRight':
    case 'left':
    case 'right':
    case 'borderLeft':
    case 'borderLeftWidth':
    case 'borderLeftStyle':
    case 'borderLeftColor':
    case 'borderRight':
    case 'borderRightWidth':
    case 'borderRightStyle':
    case 'borderRightColor':
    case 'borderTopLeftRadius':
    case 'borderTopRightRadius':
    case 'borderBottomLeftRadius':
    case 'borderBottomRightRadius':
      warning(
        `You seem to be using non-logical property '${key}' which is not compatible with RTL mode. Please use logical properties and values instead. For more information: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Logical_Properties.`,
        path,
      );
      return;
    case 'margin':
    case 'padding':
    case 'borderWidth':
    case 'borderStyle':
      // case 'borderColor':
      if (typeof value === 'string') {
        const valueArr = value.split(' ').map((item) => item.trim());
        if (valueArr.length === 4 && valueArr[1] !== valueArr[3]) {
          warning(
            `You seem to be using '${key}' property with different left ${key} and right ${key}, which is not compatible with RTL mode. Please use logical properties and values instead. For more information: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Logical_Properties.`,
            path,
          );
        }
      }
      return;
    case 'clear':
    case 'textAlign':
      if (value === 'left' || value === 'right') {
        warning(
          `You seem to be using non-logical value '${value}' of ${key}, which is not compatible with RTL mode. Please use logical properties and values instead. For more information: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Logical_Properties.`,
          path,
        );
      }
      return;
    case 'borderRadius':
      if (typeof value === 'string') {
        const radiusGroups = value.split('/').map((item) => item.trim());
        const invalid = radiusGroups.reduce((result, group) => {
          if (result) {
            return result;
          }
          const radiusArr = group.split(' ').map((item) => item.trim());
          // borderRadius: '2px 4px'
          if (radiusArr.length >= 2 && radiusArr[0] !== radiusArr[1]) {
            return true;
          }
          // borderRadius: '4px 4px 2px'
          if (radiusArr.length === 3 && radiusArr[1] !== radiusArr[2]) {
            return true;
          }
          // borderRadius: '4px 4px 2px 4px'
          if (radiusArr.length === 4 && radiusArr[2] !== radiusArr[3]) {
            return true;
          }
          return result;
        }, false);

        if (invalid) {
          warning(
            `You seem to be using non-logical value '${value}' of ${key}, which is not compatible with RTL mode. Please use logical properties and values instead. For more information: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Logical_Properties.`,
            path,
          );
        }
      }
      return;
    case 'animation':
      if (hashId && value !== 'none') {
        warning(
          `You seem to be using hashed animation '${value}', in which case 'animationName' with Keyframe as value is recommended.`,
          path,
        );
      }
    default:
      return;
  }
};

const layerKey = `layer-${Date.now()}-${Math.random()}`.replace(/\./g, '');
const layerWidth = '903px';

function supportSelector(
  styleStr: string,
  handleElement?: (ele: HTMLElement) => void,
): boolean {
  if (canUseDom()) {
    updateCSS(styleStr, layerKey);

    const ele = document.createElement('div');
    ele.style.position = 'fixed';
    ele.style.left = '0';
    ele.style.top = '0';
    handleElement?.(ele);
    document.body.appendChild(ele);

    if (process.env.NODE_ENV !== 'production') {
      ele.innerHTML = 'Test';
      ele.style.zIndex = '9999999';
    }

    const support = getComputedStyle(ele).width === layerWidth;

    ele.parentNode?.removeChild(ele);
    removeCSS(layerKey);

    return support;
  }

  return false;
}

let canLayer: boolean | undefined = undefined;
export function supportLayer(): boolean {
  if (canLayer === undefined) {
    canLayer = supportSelector(
      `@layer ${layerKey} { .${layerKey} { width: ${layerWidth}!important; } }`,
      (ele) => {
        ele.className = layerKey;
      },
    );
  }

  return canLayer!;
}
