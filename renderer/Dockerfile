FROM nvidia/cuda:12.4.1-runtime-ubuntu22.04
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl xz-utils python3-pip libgl1 libxi6 libxrender1 libxkbcommon0 libsm6 libxxf86vm1 && rm -rf /var/lib/apt/lists/*
ARG BLENDER_VERSION=4.5.16
RUN curl -fsSL "https://download.blender.org/release/Blender4.5/blender-${BLENDER_VERSION}-linux-x64.tar.xz" -o /tmp/blender.tar.xz \
    && mkdir -p /opt/blender && tar -xf /tmp/blender.tar.xz -C /opt/blender --strip-components=1 && rm /tmp/blender.tar.xz
ENV BLENDER_BIN=/opt/blender/blender
WORKDIR /worker
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt
COPY worker.py render.py scene_units.py ./
CMD ["python3", "-u", "worker.py"]
