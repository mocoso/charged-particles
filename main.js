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

async function start({
  canvas,
  numberOfParticles,
  particleRadius,
  frictionCoefficient,
  forceScalar,
}) {
  const width = canvas.width;
  const height = canvas.height;
  const rangeOfForce = calculateRangeOfForce(numberOfParticles, width, height);

  const particles = createParticles(
    numberOfParticles,
    width,
    height,
    rangeOfForce
  );

  for (var i = 0; i < 10000; i++) {
    if (i % 3 == 0) {
      draw(canvas, width, height, particles, particleRadius);
      if (
        i > 100 &&
        hasStopped(
          particles.filter((p) => {
            !isOutOfBounds(p, width, height, rangeOfForce);
          }),
          0.2
        )
      ) {
        console.log("Has stopped");
        break;
      }
    }
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
    await sleep(1);
  }

  console.log("The end");
}

function draw(canvas, width, height, particles, particleRadius) {
  if (canvas.getContext) {
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "rgb(200, 0, 0)";
    const startAngle = 0;
    const endAngle = Math.PI * 2;

    ctx.clearRect(0, 0, width, height);

    particles.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.position.x, p.position.y, particleRadius, startAngle, endAngle);
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

function hasStopped(particles, maxSpeed) {
  maxSpeedSquared = maxSpeed * maxSpeed;

  return particles.every((p) => {
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
