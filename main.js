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

    let layers;

    if (pngSrc == undefined) {
      // TO BE DONE
      layers = [
        {
          particles: createParticles(
            numberOfParticles,
            width,
            height,
            rangeOfForce
          ),
          colour: "#ff0000",
        },
      ];
    } else {
      const colours = ["#00ffff", "#ff00ff", "#ffff00"];

      layers = await Promise.all(
        colours.map(async (colour, colourIndex) => {
          return {
            particles: createParticles(
              numberOfParticles,
              width,
              height,
              rangeOfForce
            ),
            colour: colour,
            colourScalars: await colourScalarsForPngSource(
              pngSrc,
              width,
              height,
              colourIndex
            ),
          };
        })
      );
    }

    for (var i = 0; i < 1000; i++) {
      if (
        layers.every((layer) => {
          i > 100 &&
            hasNearlyStopped(
              layer.particles,
              0.25,
              width,
              height,
              rangeOfForce
            );
        })
      ) {
        console.log("Has stopped");
        break;
      }

      await tick({
        layers: layers,
        width: width,
        height: height,
        particleRadius: particleRadius,
        rangeOfForce: rangeOfForce,
        forceScalar: forceScalar,
        frictionCoefficient: frictionCoefficient,
      });
    }

    console.log("The end");
  };

  async function colourScalarsForPngSource(pngSrc, width, height, colourIndex) {
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

          resolve(colourScalarsForPng(png, width, height, colourIndex));
        }
      };
      xhr.send();
    });
  }

  async function tick({
    layers: layers,
    width: width,
    height: height,
    particleRadius: particleRadius,
    rangeOfForce: rangeOfForce,
    forceScalar: forceScalar,
    frictionCoefficient: frictionCoefficient,
  }) {
    clearCanvas(canvas, width, height);

    layers.forEach((layer) => {
      draw(
        canvas,
        width,
        height,
        layer.particles,
        particleRadius,
        layer.colourScalars,
        layer.colour
      );
    });

    await asyncForEach(layers, async (layer) => {
      updatePositions(layer.particles);
      await updateVelocities({
        particles: layer.particles,
        width: width,
        height: height,
        particleRadius: particleRadius,
        rangeOfForce: rangeOfForce,
        forceScalar: forceScalar,
        frictionCoefficient: frictionCoefficient,
      });
    });
  }

  function clearCanvas(canvas, width, height) {
    if (canvas.getContext) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, width, height);
    }
  }

  function draw(
    canvas,
    width,
    height,
    particles,
    particleRadius,
    colourScalars,
    colour
  ) {
    if (canvas.getContext) {
      const ctx = canvas.getContext("2d");
      ctx.globalCompositeOperation = "darken";
      ctx.fillStyle = colour;
      const startAngle = 0;
      const endAngle = Math.PI * 2;

      particles.forEach((p) => {
        const pngScalar = colourScalar(
          colourScalars,
          p.position,
          width,
          height
        );
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

  async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
      await callback(array[index], index, array);
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

  function colourScaleForPixel(png, point, colourIndex) {
    const index = (Math.round(point.x) + Math.round(point.y) * png.width) << 2;
    return png.data[index + colourIndex];
  }

  function colourScalarsForPng(png, width, height, colourIndex) {
    const colourScalars = [];
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        colourScalars[x] ||= [];
        sampleCoords = [
          [x - 1, y - 1],
          [x, y - 1],
          [x + 1, y - 1],
          [x - 1, y],
          [x, y],
          [x + 1, y],
          [x - 1, y + 1],
          [x, y + 1],
          [x + 1, y + 1],
        ].filter(
          (coords) =>
            coords[0] >= 0 &&
            coords[0] <= png.width &&
            coords[1] >= 0 &&
            coords[1] <= png.height
        );

        colourScalars[x][y] =
          sampleCoords
            .map(
              (coords) =>
                Math.sqrt(
                  (-colourScaleForPixel(
                    png,
                    { x: coords[0], y: coords[1] },
                    colourIndex
                  ) +
                    256) /
                    256
                ) * 1.5
            )
            .reduce((a, b) => a + b, 0) / sampleCoords.length;
      }
    }
    return colourScalars;
  }

  function colourScalar(colourScalars, position, width, height) {
    if (colourScalars == undefined) {
      return 1;
    } else {
      return colourScalars[
        Math.max(0, Math.min(width - 1, Math.round(position.x)))
      ][Math.max(0, Math.min(height - 1, Math.round(position.y)))];
    }
  }

  async function updateVelocities({
    particles,
    width,
    height,
    particleRadius,
    rangeOfForce,
    forceScalar,
    frictionCoefficient,
  }) {
    const minimumDistanceSquared = (particleRadius * 2) ** 2;
    await asyncForEach(particles, async (p, index) => {
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

      if (index % 250 === 0) {
        await sleep(10);
      }
    });
  }

  return { start: start };
})();
