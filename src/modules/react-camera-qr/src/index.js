const React = require("react");
const PropTypes = require("prop-types");
const { getDefaultDeviceId, getIdDirectly } = require("./getDeviceId");
const havePropsChanged = require("./havePropsChanged");
const createBlob = require("./createBlob");
const { isIOS } = require("react-device-detect");

// Require adapter to support older browser implementations
require("webrtc-adapter");

// Inline worker.js as a string value of workerBlob.
// eslint-disable-next-line
let workerBlob = createBlob([__inline("../lib/worker.js")], {
  type: "application/javascript",
});
// Props that are allowed to change dynamicly
const propsKeys = ["delay", "facingMode", "chosenCamera"];

const containerStyle = {
  overflow: "hidden",
  position: "unset",
  width: "100%",
  height: "100%",
  paddingTop: "100%",
};
const hiddenStyle = { display: "none" };
const previewStyle = {
  top: 0,
  left: 0,
  display: "block",
  position: "absolute",
  overflow: "hidden",
  width: "100%",
  height: "100%",
};

const viewFinderStyle = {
  top: 0,
  left: 0,
  zIndex: 1,
  boxSizing: "border-box",
  border: "50px solid rgba(0, 0, 0, 0.3)",
  boxShadow: "inset 0 0 0 5px rgba(255, 0, 0, 0.5)",
  position: "absolute",
  width: "100%",
  height: "100%",
};

class Reader extends React.Component {
  els = {};

  constructor(props) {
    super(props);

    this.state = {
      mirrorVideo: false,
      streamTrack: null,
    };

    // Bind function to the class
    this.initiate = this.initiate.bind(this);
    this.check = this.check.bind(this);
    this.handleVideo = this.handleVideo.bind(this);
    this.handleLoadStart = this.handleLoadStart.bind(this);
    this.clearComponent = this.clearComponent.bind(this);
    this.handleReaderLoad = this.handleReaderLoad.bind(this);
    this.handleWorkerMessage = this.handleWorkerMessage.bind(this);
    this.setRefFactory = this.setRefFactory.bind(this);
  }

  componentDidMount() {
    // Initiate web worker execute handler according to mode.
    this.worker = new Worker(URL.createObjectURL(workerBlob));
    this.worker.onmessage = this.handleWorkerMessage;
    this.initiate();
  }

  componentWillReceiveProps(nextProps) {
    // React according to change in props
    // Rerender when specificCamera changes too
    const changedProps = havePropsChanged(this.props, nextProps, propsKeys);

    for (const prop of changedProps) {
      if (prop === "facingMode" || prop === "chosenCamera") {
        this.clearComponent();
        this.initiate(nextProps);
        break;
      } else if (prop === "delay") {
        if (this.props.delay === false) {
          this.timeout = setTimeout(this.check, nextProps.delay);
        }
        if (nextProps.delay === false) {
          clearTimeout(this.timeout);
        }
      }
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (nextState !== this.state) {
      return true;
    }

    // Only render when the `propsKeys` have changed.
    const changedProps = havePropsChanged(this.props, nextProps, propsKeys);
    return changedProps.length > 0;
  }

  componentWillUnmount() {
    // Stop web-worker and clear the component
    if (this.worker) {
      this.worker.terminate();
      this.worker = undefined;
    }
    this.clearComponent();
  }

  clearComponent() {
    // Remove all event listeners and variables
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = undefined;
    }
    if (this.stopCamera) {
      this.stopCamera();
    }
    if (this.reader) {
      this.reader.removeEventListener("load", this.handleReaderLoad);
    }
    if (this.els.img) {
      this.els.img.removeEventListener("load", this.check);
    }
  }

  initiate(props = this.props) {
    const { onError, facingMode, chosenCamera } = props;

    // Check browser facingMode constraint support
    // Firefox ignores facingMode or deviceIdok constraints
    const isFirefox = /firefox/i.test(navigator.userAgent);
    let supported = {};
    let enumerateDevices = {};
    if (
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getSupportedConstraints === "function"
    ) {
      supported = navigator.mediaDevices.getSupportedConstraints();
    }
    const constraints = {};

    if (supported.facingMode) {
      constraints.facingMode = { ideal: facingMode };
    }
    if (supported.frameRate) {
      constraints.frameRate = { ideal: 25, min: 10 };
    }
    // if prop 'chosenCamera' is present with info
    // use that camera instead and
    // just pass the id provided to this.handleVideo
    let vConstraintsPromise;
    if (chosenCamera === "" || isIOS) {
      vConstraintsPromise =
        supported.facingMode || isFirefox
          ? Promise.resolve(props.constraints || constraints)
          : getDefaultDeviceId(facingMode).then((deviceId) =>
              Object.assign({}, { deviceId }, props.constraints)
            );
    } else {
      vConstraintsPromise = getIdDirectly(
        facingMode,
        chosenCamera
      ).then((deviceId) => Object.assign({}, { deviceId }, props.constraints));
    }
    vConstraintsPromise
      .then((video) => navigator.mediaDevices.getUserMedia({ video }))
      .then(this.handleVideo)
      .catch(onError);
  }

  handleVideo(stream) {
    const { preview } = this.els;
    const { facingMode } = this.props;

    // Preview element hasn't been rendered so wait for it.
    if (!preview && this.worker !== undefined) {
      return setTimeout(this.handleVideo, 200, stream);
    }

    // Handle different browser implementations of MediaStreams as src
    if ((preview || {}).srcObject !== undefined) {
      preview.srcObject = stream;
    } else if (preview.mozSrcObject !== undefined) {
      preview.mozSrcObject = stream;
    } else if (window.URL.createObjectURL) {
      preview.src = window.URL.createObjectURL(stream);
    } else if (window.webkitURL) {
      preview.src = window.webkitURL.createObjectURL(stream);
    } else {
      preview.src = stream;
    }

    // IOS play in fullscreen
    preview.playsInline = true;

    const streamTrack = stream.getTracks()[0];
    // Assign `stopCamera` so the track can be stopped once component is cleared
    this.stopCamera = streamTrack.stop.bind(streamTrack);

    preview.addEventListener("loadstart", this.handleLoadStart);

    this.setState({ mirrorVideo: facingMode === "user", streamTrack });
  }

  handleLoadStart() {
    const { delay, onLoad } = this.props;
    const { mirrorVideo, streamTrack } = this.state;
    const preview = this.els.preview;
    preview.play();

    if (typeof onLoad === "function") {
      onLoad({ mirrorVideo, streamTrack });
    }

    if (typeof delay === "number") {
      this.timeout = setTimeout(this.check, delay);
    }

    // Some browsers call loadstart continuously
    preview.removeEventListener("loadstart", this.handleLoadStart);
  }

  check() {
    const { resolution, delay } = this.props;
    const { preview, canvas } = this.els;

    // Get image/video dimensions
    let width = Math.floor(preview.videoWidth);

    // Only scan top half of screen to sync with our viewfinder
    let height = Math.floor(preview.videoHeight) / 2;

    // Canvas draw offsets
    let hozOffset = 0;
    let vertOffset = 0;

    // Scale image to correct resolution
    // Crop image to fit 1:1 aspect ratio
    const smallestSize = width < height ? width : height;
    const ratio = resolution / smallestSize;

    height = ratio * height;
    width = ratio * width;

    vertOffset = ((height - resolution) / 2) * -1;
    hozOffset = ((width - resolution) / 2) * -1;

    canvas.width = resolution;
    // Only scan top half of screen to sync with our viewfinder

    canvas.height = resolution / 2;

    const previewIsPlaying =
      preview && preview.readyState === preview.HAVE_ENOUGH_DATA;

    if (previewIsPlaying) {
      const ctx = canvas.getContext("2d");

      ctx.drawImage(preview, hozOffset, vertOffset, width, height);
      // const sx = (width / 2) - (100 / 2);
      // const sy = (height / 2) - (100 / 2);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      // Send data to web-worker
      this.worker.postMessage(imageData);
    } else {
      // Preview not ready -> check later
      this.timeout = setTimeout(this.check, delay);
    }
  }

  handleWorkerMessage(e) {
    const { onScan, delay } = this.props;
    const decoded = e.data || {};
    onScan(decoded.data || null, decoded.chunks || []);
    if (typeof delay === "number" && this.worker) {
      this.timeout = setTimeout(this.check, delay);
    }
  }

  handleReaderLoad(e) {
    // Set selected image blob as img source
    this.els.img.src = e.target.result;
  }

  setRefFactory(key) {
    return (element) => {
      this.els[key] = element;
    };
  }

  render() {
    const { style, className, showViewFinder } = this.props;

    const videoPreviewStyle = {
      ...previewStyle,
      objectFit: "cover",
      transform: this.state.mirrorVideo ? "scaleX(-1)" : "",
    };

    return (
      <section className={className} style={style}>
        <section style={containerStyle}>
          {showViewFinder && <div style={viewFinderStyle} />}
          <video
            style={videoPreviewStyle}
            ref={this.setRefFactory("preview")}
          />
          <canvas style={hiddenStyle} ref={this.setRefFactory("canvas")} />
        </section>
      </section>
    );
  }
}

Reader.propTypes = {
  onScan: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired,
  onLoad: PropTypes.func,
  delay: PropTypes.oneOfType([PropTypes.number, PropTypes.bool]),
  facingMode: PropTypes.oneOf(["user", "environment"]),
  chosenCamera: PropTypes.string,
  resolution: PropTypes.number,
  showViewFinder: PropTypes.bool,
  style: PropTypes.any,
  className: PropTypes.string,
  constraints: PropTypes.object,
};

Reader.defaultProps = {
  delay: 500,
  resolution: 600,
  facingMode: "environment",
  chosenCamera: "",
  showViewFinder: true,
  constraints: null,
};

export default Reader;
