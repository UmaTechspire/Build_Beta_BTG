import React, { Component } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import { } from "../../store/actions";

import { Link } from "react-router-dom";

//i18n
import { withTranslation } from "react-i18next";
import SidebarContent from "./SidebarContent";

import logo from "../../assets/images/logo.png";
import logoLightPng from "../../assets/images/logo.png";
import logoLightSvg from "../../assets/images/logo.png";
import logoDark from "../../assets/images/logo.png";

class Sidebar extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    return (
      <React.Fragment>
        <div className="vertical-menu">
          <div className="navbar-brand-box">
            <Link to="/" className="logo logo-dark">
              <span className="logo-sm">
                <img src={logo} alt="" style={{ height: '30PX' }}/>
              </span>
              <span className="logo-lg">
                <img src={logoDark} alt="" style={{ height: '69px' }}/>
              </span>
            </Link>

            <Link to="/" className="logo logo-light">
              <span className="logo-sm">
                <img src={logoLightSvg} alt="" style={{ height: '30PX' }}/>
              </span>
              <span className="logo-lg">
                <img src={logoLightPng} alt="" style={{ height: '69px' }}/>
              </span>
            </Link>
          </div>
          <div data-simplebar className="h-100">
            {this.props.type !== "condensed" ? <SidebarContent /> : <SidebarContent />}
          </div>
          {this.props.type !== "condensed" && (
            <div className="sidebar-version">
              V 1.0.0.1
            </div>
          )}
          <div className="sidebar-background"></div>
        </div>
      </React.Fragment>
    );
  }
}

Sidebar.propTypes = {
  type: PropTypes.string,
};

const mapStateToProps = state => {
  return {
    layout: state.Layout,
  };
};
export default connect(
  mapStateToProps,
  {}
)(withRouter(withTranslation()(Sidebar)));
