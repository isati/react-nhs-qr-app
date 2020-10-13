import React from "react";
import { Link } from "react-router-dom";
import GitHubIcon from "../assets/github.svg";
import CloseIcon from "../assets/close.svg";
import Bounce from "react-reveal/Bounce";

const About = () => {
  return (
    <Bounce bottom>
      <div className="aboutContainer">
        <Link to="/">
          <img className="closeIcon" alt="Camera menu" src={CloseIcon} />
        </Link>
        <ul className="about">
          <li>App does not collect or send data anywhere.</li>
          <li>
            Choose "Add to Homescreen" in browser for a more app-like
            experience. App can be used offline.
          </li>
          <li>
            Scan the QR code in the middle of the camera as the viewport is only
            an overlay.
          </li>
          <li>Double tap outside the viewport area to enter fullscreen.</li>
          <li>
            App will present a text input field if no cameras detected or camera
            permission denied.
          </li>
        </ul>
        <div className="donate">
          <h3>Please send donations/tips to: </h3>

          <div className="crypto">
            BTC: bc1qt54pz3ynwd2ucgf6ucffhx2c5qcfr967zzqevd
          </div>
          <div className="paypal">
            Or via PayPal
            <form
              action="https://www.paypal.com/cgi-bin/webscr"
              method="post"
              target="_top"
            >
              <input type="hidden" name="cmd" value="_s-xclick" />
              <input
                type="hidden"
                name="hosted_button_id"
                value="RMYC8SD4RYKV6"
              />
              <input
                type="image"
                src="https://www.paypalobjects.com/en_GB/i/btn/btn_donate_LG.gif"
                border="0"
                name="submit"
                title="PayPal - The safer, easier way to pay online!"
                alt="Donate with PayPal button"
              />
              <img
                className="paypalButton"
                alt=""
                border="0"
                src="https://www.paypal.com/en_GB/i/scr/pixel.gif"
                width="1"
                height="1"
              />
            </form>
          </div>
          <p>Thank you.</p>
        </div>
        <div>
          Made with{" "}
          <span role="img" aria-label="heart">
            ❤️
          </span>{" "}
          by sick.earth
          <div className="footer">
            {" "}
            <a href="https://github.com/isati/react-nhs-qr-app">
              {" "}
              <img className="githubIcon" alt="GitHub" src={GitHubIcon} />{" "}
            </a>
          </div>
          <div className="versionNumber">
            {`${process.env.REACT_APP_VERSION}`}
          </div>
        </div>
      </div>
    </Bounce>
  );
};

export default About;