import { PNG } from "pngjs/browser";
import { Buffer } from "buffer";

ChargedParticles = (() => {
  function createParticles(n, width, height, rangeOfForce) {
    const particles = [];

    for (var i = 0; i < n; i++) {
      particles.push({
        position: {
          x: Math.random() * (width + rangeOfForce * 2) - rangeOfForce,
          y: Math.random() * (height + rangeOfForce * 2) - rangeOfForce,
        },
        velocity: { x: 0, y: 0 },
      });
    }

    return particles;
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function calculateRangeOfForce(numberOfParticles, width, height) {
    return Math.sqrt((width * height) / numberOfParticles) * Math.PI;
  }

  const start = async function start({
    canvas,
    pngSrc,
    numberOfParticles,
    particleRadius,
    frictionCoefficient,
    forceScalar,
  }) {
    const width = canvas.width;
    const height = canvas.height;
    const rangeOfForce = calculateRangeOfForce(
      numberOfParticles,
      width,
      height
    );

    const particles = createParticles(
      numberOfParticles,
      width,
      height,
      rangeOfForce
    );

    const greyScalars =
      pngSrc == undefined
        ? undefined
        : await greyScalarsForPngSource(pngSrc, width, height);

    for (var i = 0; i < 1000; i++) {
      if (
        i > 100 &&
        hasNearlyStopped(particles, 0.25, width, height, rangeOfForce)
      ) {
        console.log("Has stopped");
        break;
      }

      tick({
        particles: particles,
        greyScalars: greyScalars,
        width: width,
        height: height,
        particleRadius: particleRadius,
        rangeOfForce: rangeOfForce,
        forceScalar: forceScalar,
        frictionCoefficient: frictionCoefficient,
      });

      await sleep(1);
    }

    console.log("The end");
  };

  async function greyScalarsForPngSource(pngSrc, width, height) {
    return new Promise(function (resolve, _) {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", pngSrc, true);
      xhr.responseType = "arraybuffer";
      xhr.onload = function (e) {
        if (this.status == 200) {
          const buf = Buffer.from(this.response);

          const png = PNG.sync.read(buf, function (err, _) {
            if (err) throw err;
          });

          resolve(greyScalarsForPng(png, width, height));
        }
      };
      xhr.send();
    });
  }

  function tick({
    particles: particles,
    greyScalars: greyScalars,
    width: width,
    height: height,
    particleRadius: particleRadius,
    rangeOfForce: rangeOfForce,
    forceScalar: forceScalar,
    frictionCoefficient: frictionCoefficient,
  }) {
    draw(canvas, width, height, particles, particleRadius, greyScalars);
    updatePositions(particles);
    updateVelocities({
      particles: particles,
      width: width,
      height: height,
      particleRadius: particleRadius,
      rangeOfForce: rangeOfForce,
      forceScalar: forceScalar,
      frictionCoefficient: frictionCoefficient,
    });
  }

  function draw(canvas, width, height, particles, particleRadius, greyScalars) {
    if (canvas.getContext) {
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "rgb(200, 0, 0)";
      const startAngle = 0;
      const endAngle = Math.PI * 2;
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        const pngScalar = greyScalar(greyScalars, p.position, width, height);
        ctx.beginPath();
        ctx.arc(
          p.position.x,
          p.position.y,
          particleRadius * pngScalar,
          startAngle,
          endAngle
        );
        ctx.fill();
      });
    }
  }

  function subtractVector(v, w) {
    return { x: v.x - w.x, y: v.y - w.y };
  }

  function addVector(v, w) {
    return { x: v.x + w.x, y: v.y + w.y };
  }

  function scaleVector(v, scale) {
    return { x: v.x * scale, y: v.y * scale };
  }

  function unitVector(v) {
    if (v.x == 0 && v.y == 0) {
      throw "Can't make unit vector from zero";
    }
    const length = Math.sqrt(lengthSquared(v));
    return scaleVector(v, 1 / length);
  }

  function lengthSquared(v) {
    return v.x * v.x + v.y * v.y;
  }

  function updatePositions(particles) {
    particles.forEach((p) => {
      p.position = addVector(p.position, p.velocity);
    });
  }

  function isOutOfBounds(particle, width, height, rangeOfForce) {
    return (
      isOutOfHorizontalBounds(particle, width, rangeOfForce) ||
      isOutOfVerticalBounds(particle, height, rangeOfForce)
    );
  }

  function isOutOfHorizontalBounds(particle, width, rangeOfForce) {
    return (
      particle.position.x < -rangeOfForce ||
      particle.position.x > width + rangeOfForce
    );
  }

  function isOutOfVerticalBounds(particle, height, rangeOfForce) {
    return (
      particle.position.y < -rangeOfForce ||
      particle.position.y > height + rangeOfForce
    );
  }

  function hasNearlyStopped(particles, maxSpeed, width, height, rangeOfForce) {
    maxSpeedSquared = maxSpeed * maxSpeed;

    const inBounds = particles.filter((p) => {
      return !isOutOfBounds(p, width, height, rangeOfForce);
    });

    return inBounds.every((p) => {
      return lengthSquared(p.velocity) < maxSpeedSquared;
    });
  }

  function closestParticles(particle, particles, range) {
    rangeSquared = range * range;

    return particles.filter((q) => {
      return (
        lengthSquared(subtractVector(particle.position, q.position)) <
        rangeSquared
      );
    });
  }

  function greyScaleForPixel(png, point) {
    const index = (Math.round(point.x) + Math.round(point.y) * png.width) << 2;
    return (png.data[index] + png.data[index + 1] + png.data[index + 2]) / 3;
  }

  function greyScalarsForPng(png, width, height) {
    const greyScalars = [];
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        greyScalars[x] ||= [];
        greyScalars[x][y] =
          Math.sqrt((-greyScaleForPixel(png, { x: x, y: y }) + 256) / 256) *
          1.5;
      }
    }
    return greyScalars;
  }

  function greyScalar(greyScalars, position, width, height) {
    if (greyScalars == undefined) {
      return 1;
    } else {
      return greyScalars[
        Math.max(0, Math.min(width - 1, Math.round(position.x)))
      ][Math.max(0, Math.min(height - 1, Math.round(position.y)))];
    }
  }

  function updateVelocities({
    particles,
    width,
    height,
    particleRadius,
    rangeOfForce,
    forceScalar,
    frictionCoefficient,
  }) {
    const minimumDistanceSquared = (particleRadius * 2) ** 2;
    particles.forEach((p) => {
      closestParticles(p, particles, rangeOfForce).forEach((q) => {
        if (!(p.position.x == q.position.x && p.position.y == q.position.y)) {
          diff = subtractVector(p.position, q.position);
          force =
            forceScalar / Math.max(lengthSquared(diff), minimumDistanceSquared);
          change = scaleVector(unitVector(diff), force);
          p.velocity = addVector(p.velocity, change);
        }
      });

      if (isOutOfHorizontalBounds(p, width, rangeOfForce)) {
        p.velocity.x = Math.random() - 0.5;
      }

      if (isOutOfVerticalBounds(p, height, rangeOfForce)) {
        p.velocity.y = Math.random() - 0.5;
      }

      p.velocity = scaleVector(p.velocity, 1 - frictionCoefficient);
    });
  }

  return { start: start };
})();
