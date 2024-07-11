"use strict";
const gmcTransf = { version: "1.2.1" };
(function (t, n) {
  if (typeof define === "function" && define.amd) {
    define([], n);
  } else if (typeof module === "object" && module.exports) {
    module.exports = n();
  } else {
    t.gmcTransf = n();
  }
})(typeof self !== "undefined" ? self : this, function () {
  return gmcTransf;
});
if (typeof exports === "object" && typeof module !== "undefined") {
  module.exports = gmcTransf;
} else if (typeof define === "function" && define["amd"]) {
  define([], function () {
    return gmcTransf;
  });
} else if (typeof exports === "object") {
  exports["gmcTransf"] = gmcTransf;
}
// canvas的放射变化参数
// A = [
//         [ a ,c , e ],
//         [ b ,d , f ],
//         [ 0 ,0 , 1 ]
// ]
// 根据顶点构建矩阵
// x1 , y1 , 1 , 0  , 0  , 0                    a       x11
// 0  , 0  , 0 , x1 , y1 , 1                    c       y11
// x2 , y2 , 1 , 0  , 0  , 0                    e       x22
// 0  , 0  , 0 , x2 , y2 , 1        =           b   *   y22
// x3 , y3 , 1 , 0  , 0  , 0                    d       x33
// 0  , 0  , 0 , x3 , y3 , 1                    f       y33
//求逆矩阵
function gaussJordan(t) {
  const n = t.length;
  const e = t.map((t, e) => [
    ...t,
    ...Array(n)
      .fill(0)
      .map((t, n) => (e === n ? 1 : 0)),
  ]);
  for (let t = 0; t < n; t++) {
    let o = Math.abs(e[t][t]);
    let s = t;
    for (let a = t + 1; a < n; a++) {
      if (Math.abs(e[a][t]) > o) {
        o = Math.abs(e[a][t]);
        s = a;
      }
    }
    [e[s], e[t]] = [e[t], e[s]];
    const a = e[t][t];
    for (let o = 0; o < 2 * n; o++) {
      e[t][o] /= a;
    }
    for (let o = 0; o < n; o++) {
      if (o !== t) {
        const s = e[o][t];
        for (let a = 0; a < 2 * n; a++) {
          e[o][a] -= s * e[t][a];
        }
      }
    }
  }
  const o = e.map((t) => t.slice(n, 2 * n));
  return o;
}
function multiplyMatrix(t, n) {
  const e = t.length,
    o = t[0].length;
  const s = n.length,
    a = n[0].length;
  const r = Array.from({ length: e }, () => Array(a).fill(0));
  for (let s = 0; s < e; s++) {
    for (let e = 0; e < a; e++) {
      for (let a = 0; a < o; a++) {
        r[s][e] += t[s][a] * n[a][e];
      }
    }
  }
  return r;
}
// 求解线性方程组 A * x = b
function solveLinearSystem(t, n) {
  const e = gaussJordan(t);
  const o = n.map((t) => [t]);
  const s = multiplyMatrix(e, o);
  return s.map((t) => t[0]);
}
function applyHomographyMatrix(t, n, e, o, s, a, r, c, i, f, m) {
  const l = e * t + o * n + s;
  const u = a * t + r * n + c;
  const g = i * t + f * n + m;
  return [l / g, u / g];
}
function get_transf_matrix(t, n, e) {
  let o = t.reduce(
    (t, n) => {
      let [e, o] = n;
      if (e < t.minX[0]) t.minX = n;
      if (e > t.maxX[0]) t.maxX = n;
      if (o < t.minY[1]) t.minY = n;
      if (o > t.maxY[1]) t.maxY = n;
      return t;
    },
    { minX: t[0], maxX: t[0], minY: t[0], maxY: t[0] }
  );
  const s = o.maxX[0];
  const a = o.minX[0];
  const r = o.maxY[1];
  const c = o.minY[1];
  const i = n / (s - a);
  const f = e / (r - c);
  const m = [
    [0, 0],
    [n, 0],
    [n, e],
    [0, e],
  ];
  const l = [
    [(o.maxY[0] - a) * i, (r - o.maxY[1]) * f],
    [(o.maxX[0] - a) * i, (r - o.maxX[1]) * f],
    [(o.minY[0] - a) * i, (r - o.minY[1]) * f],
    [(o.minX[0] - a) * i, (r - o.minX[1]) * f],
  ];
  return { bbox: [a, c, s, r], srcMat: m, dstMat: l };
}

gmcTransf.persp = function (t, n, e) {
  const o = new Image();
  o.src = n;
  o.crossOrigin = "anonymous";
  o.onload = function () {
    let n = o.width;
    let s = o.height;
    let { bbox: a, srcMat: r, dstMat: c } = get_transf_matrix(t, n, s);
    const i = [];
    const f = [];
    // 透视变换需要四个点
    for (let t = 0; t < 4; t++) {
      let [n, e] = r[t];
      let [o, s] = c[t];
      i.push([n, e, 1, 0, 0, 0, -o * n, -o * e]);
      i.push([0, 0, 0, n, e, 1, -s * n, -s * e]);
      f.push([o]);
      f.push([s]);
    }
    const m = solveLinearSystem(i, f);
    let l = [
      [m[0], m[1], m[2]],
      [m[3], m[4], m[5]],
      [m[6], m[7], 1],
    ];
    const [[u, g, p], [d, h, x], [y, M, b]] = l;
    const X = document.createElement("canvas");
    X.width = n;
    X.height = s;
    const Y = X.getContext("2d");
    Y.drawImage(o, 0, 0);
    const w = Y.getImageData(0, 0, n, s);
    const T = Y.createImageData(n, s);
    for (let t = 0; t < s; t++) {
      for (let e = 0; e < n; e++) {
        // 计算源图像中的对应坐标
        const [o, a] = applyHomographyMatrix(e, t, u, g, p, d, h, x, y, M, b);
        // 判断坐标是否在源图像范围内
        if (o >= 0 && o <= n && a >= 0 && a <= s) {
          const s = (Math.floor(a) * n + Math.floor(o)) * 4;
          const r = (t * X.width + e) * 4;
          for (let t = 0; t < 4; t++) {
            T.data[s + t] = w.data[r + t];
          }
        }
      }
    }
    Y.putImageData(T, 0, 0);
    e({ imageExtent: a, url: X.toDataURL("image/png") });
  };
};
gmcTransf.affine = function (t, n, e) {
  const o = new Image();
  o.src = n;
  o.crossOrigin = "anonymous";
  o.onload = function () {
    let n = o.width;
    let s = o.height;
    let { bbox: a, srcMat: r, dstMat: c } = get_transf_matrix(t, n, s);
    const i = [];
    const f = [];
    // 平面变换需要三个点
    for (let t = 0; t < 3; t++) {
      let [n, e] = r[t];
      let [o, s] = c[t];
      i.push([n, e, 1, 0, 0, 0]);
      i.push([0, 0, 0, n, e, 1]);
      f.push([o]);
      f.push([s]);
    }
    const m = solveLinearSystem(i, f);
    let l = [
      [m[0], m[1], m[2]],
      [m[3], m[4], m[5]],
    ];
    const [[u, g, p], [d, h, x]] = l;
    const y = document.createElement("canvas");
    y.width = n;
    y.height = s;
    const M = y.getContext("2d");
    M.transform(u, d, g, h, p, x);
    M.drawImage(o, 0, 0);
    e({ imageExtent: a, url: y.toDataURL("image/png") });
  };
};
