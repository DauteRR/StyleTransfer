import React, { Component } from "react";
import Camera from "../Camera/Camera";
import DownloadableImageList from "../DownloadableImageList";
import * as IdbUtils from "../../utils/indexedDatabase";
import * as MediaUtils from "../../utils/mediaUtils";
import { IImageData } from "../../utils/IImageData";
import "./App.scss";

//@ts-ignore
import ml5 from "ml5";
import styleInfos from "../../utils/StyleInfos";
import {
  IDimensions,
  getMaxDimensionsRespectingAspectRatio
} from "../../utils/dimensions";

interface AppState {
  imageData: IImageData[];
  selectedStyle: string;
  styleTransfer: Promise<any> | null;
}

class App extends Component<{}, AppState> {
  state: AppState = {
    imageData: [],
    styleTransfer: null,
    selectedStyle: "None"
  };

  componentDidMount() {
    IdbUtils.getAllImageData().then(imageDataList =>
      this.setState({ imageData: imageDataList })
    );
  }

  private _deleteImage = (key: number) => {
    IdbUtils.deleteImageData(key);
    this.setState(({ imageData }) => ({
      imageData: imageData.filter(({ date }) => date !== key)
    }));
  };

  private async _loadImage(
    media: HTMLImageElement | HTMLVideoElement,
    dimensions: IDimensions
  ) {
    const blob = await MediaUtils.mediaToBlob(media, dimensions);
    const date = Date.now();
    const newImageData = { date, blob, ...dimensions };

    IdbUtils.saveImageData(newImageData);
    this.setState(prevState => ({
      imageData: [...prevState.imageData, newImageData]
    }));
  }

  private _onNewPhoto = async (video: HTMLVideoElement) => {
    const cameraAspectRatio = MediaUtils.getAspectRatio(video);
    const dimensions = getMaxDimensionsRespectingAspectRatio(cameraAspectRatio);

    if (!this.state.styleTransfer) {
      this._loadImage(video, dimensions);
    } else {
      const style = await this.state.styleTransfer;
      const img = await style.transfer(video);

      if (img.complete) {
        this._loadImage(img, dimensions);
      } else {
        img.addEventListener(
          "load",
          this._loadImage.bind(this, img, dimensions),
          { once: true }
        );
      }
    }
  };

  private _onStyleSelection(name: string, pathToModel: string) {
    const styleTransfer = ml5.styleTransfer(pathToModel);

    this.setState({
      styleTransfer,
      selectedStyle: name
    });
  }

  render() {
    return (
      <div className="centered">
        <ul className="style-list">
          <li>
            <label
              className={`style-list__style-option ${
                this.state.selectedStyle === "None"
                  ? "style-list__style-option--selected"
                  : ""
              }`}
            >
              <div className="style-option__img--none" />
              <button
                className="style-option__btn"
                onClick={() =>
                  this.setState({ styleTransfer: null, selectedStyle: "None" })
                }
              >
                None
              </button>
            </label>
          </li>
          {styleInfos.map(({ name, pathToImage, pathToModel }) => (
            <li key={name}>
              <label
                className={`style-list__style-option ${
                  this.state.selectedStyle === name
                    ? "style-list__style-option--selected"
                    : ""
                }`}
              >
                <img
                  className="style-option__img"
                  src={pathToImage}
                  alt={`Image of the "${name}" style`}
                />
                <button
                  className="style-option__btn"
                  onClick={() => this._onStyleSelection(name, pathToModel)}
                >
                  {name}
                </button>
              </label>
            </li>
          ))}
        </ul>
        <Camera onNewPhoto={this._onNewPhoto} />
        <DownloadableImageList
          imageData={this.state.imageData}
          deleteImage={this._deleteImage}
        />
      </div>
    );
  }
}

export default App;
