import PropTypes from "prop-types";
import React, { Component } from "react";
import "react-drawer/lib/react-drawer.css";

import { connect } from "react-redux";
import { Row, Col } from "reactstrap";
import PasswordModal from "../CommonForBoth/TopbarDropdown/PasswordModal";

import { Link } from "react-router-dom";

// Reactstrap
import { Dropdown, DropdownToggle, DropdownMenu } from "reactstrap";
import { GetUserById, GetDepartmentById, GetApprovalDiscussionList, GetCEODiscussionNotification } from "../../common/data/mastersapi";
// Import menuDropdown
import LanguageDropdown from "../CommonForBoth/TopbarDropdown/LanguageDropdown";
import NotificationDropdown from "../CommonForBoth/TopbarDropdown/NotificationDropdown";
import ProfileMenu from "../CommonForBoth/TopbarDropdown/ProfileMenu";

import megamenuImg from "../../assets/images/megamenu-img.png";

// import images
import github from "../../assets/images/brands/github.png";
import bitbucket from "../../assets/images/brands/bitbucket.png";
import dribbble from "../../assets/images/brands/dribbble.png";
import dropbox from "../../assets/images/brands/dropbox.png";
import mail_chimp from "../../assets/images/brands/mail_chimp.png";
import slack from "../../assets/images/brands/slack.png";

import logo from "../../assets/images/logo.svg";
import logoLightSvg from "../../assets/images/logo-light.svg";

//i18n
import { withTranslation } from "react-i18next";

// Redux Store
import { toggleRightSidebar } from "../../store/actions";

class Header extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isSearch: false,
      open: false,
      position: "right",

      modalOpen: false,
      modalMode: "change",

      isSalesDepartment: true, // NEW STATE

      // Existing discussions notification (approver → claimant)
      discussionCount: 0,
      discussionList: [],
      discussionDropdownOpen: false,

      // CEO notification: claimant replied back to CEO
      ceoDiscussionCount: 0,
      ceoDiscussionList: [],
      ceoDropdownOpen: false,
    };

    this.toggleMenu = this.toggleMenu.bind(this);
    this.toggleFullscreen = this.toggleFullscreen.bind(this);
  }

  openChangePasswordModal = () => {
    this.setState({ modalOpen: true, modalMode: "change" });
  };

  openLogoutModal = () => {
    this.setState({ modalOpen: true, modalMode: "logout" });
  };

  closeModal = () => {
    this.setState({ modalOpen: false });
  };

  /**
   * Toggle sidebar
   */
  toggleMenu() {
    this.props.toggleMenuCallback();
  }

  /**
   * Toggles the sidebar
   */
  toggleRightbar() {
    this.props.toggleRightSidebar();
  }


  toggleFullscreen() {
    if (
      !document.fullscreenElement &&
      /* alternative standard method */ !document.mozFullScreenElement &&
      !document.webkitFullscreenElement
    ) {
      // current working methods
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      } else if (document.documentElement.mozRequestFullScreen) {
        document.documentElement.mozRequestFullScreen();
      } else if (document.documentElement.webkitRequestFullscreen) {
        document.documentElement.webkitRequestFullscreen(
          Element.ALLOW_KEYBOARD_INPUT
        );
      }
    } else {
      if (document.cancelFullScreen) {
        document.cancelFullScreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.webkitCancelFullScreen) {
        document.webkitCancelFullScreen();
      }
    }
  }

  async componentDidMount() {
    try {
      const user = JSON.parse(localStorage.getItem("authUser"));

      //  Fetch user details
      const userDetails = await GetUserById(user?.u_id, 1);
      const departmentId = userDetails?.department;

      //  Fetch department details
      const dept = await GetDepartmentById(`1?DepartId=${departmentId}`);


      const deptName = dept?.data?.DepartmentName?.toLowerCase() || "";

      // Check if department contains "sales"
      const isSales = deptName ? deptName.includes("sales") : true;


      this.setState({ isSalesDepartment: isSales });

      //  Load discussions (updated to use Python API)
      const res = await GetApprovalDiscussionList(1, 1, user?.u_id);

      if (res?.status) {
        this.setState({
          discussionCount: res.data.length,
          discussionList: res.data,
        });
      }

      // Load CEO discussion notifications (claimant replied back to CEO)
      const ceoRes = await GetCEODiscussionNotification(1, 1, user?.u_id);
      if (ceoRes?.status) {
        this.setState({
          ceoDiscussionCount: ceoRes.data.length,
          ceoDiscussionList: ceoRes.data,
        });
      }
    } catch (err) {
      console.error("Failed:", err);
    }
  }

  render() {
    return (
      <React.Fragment>
        <header id="page-topbar">
          <div className="navbar-header">
            <div className="d-flex">
              <div className="navbar-brand-box d-lg-none d-md-block">
                <Link to="/manage-quotation" className="logo logo-dark">
                  <span className="logo-sm">
                    <img src={logo} alt="" height="22" />
                  </span>
                </Link>

                <Link to="/manage-quotation" className="logo logo-light">
                  <span className="logo-sm">
                    <img src={logo} alt="" height="22" />
                  </span>
                </Link>
              </div>

              <button
                type="button"
                onClick={this.toggleMenu}
                className="btn btn-sm px-3 font-size-16 header-item"
                id="vertical-menu-btn"
              >
                <i className="fa fa-fw fa-bars"></i>
              </button>
            </div>

            <div className="d-flex">

              {/*  UPDATES BUTTON WITH CONDITIONAL DISPLAY  */}
              <div className="dropdown d-inline-block">
                <Dropdown
                  isOpen={this.state.dropdownOpen}
                  toggle={() =>
                    this.setState({
                      dropdownOpen: !this.state.dropdownOpen,
                    })
                  }
                >
                  <DropdownToggle
                    className="btn header-item noti-icon"
                    tag="button"
                    onClick={() => {
                      window.location.href = "/Manageapproval";
                    }}
                  >
                    {/*  HIDE THIS IF DEPARTMENT IS SALES  */}
                    {!this.state.isSalesDepartment && (
                      <span className="blink-text2">
                        Updates Waiting - Refresh!
                      </span>
                    )}
                  </DropdownToggle>
                </Dropdown>
              </div>

              {/* DISCUSSIONS */}
              {this.state.discussionCount > 0 && (
                <>
                  <span className="blink-text">Discussions</span>
                  <div className="dropdown d-inline-block">
                    <Dropdown
                      isOpen={this.state.discussionDropdownOpen}
                      toggle={() =>
                        this.setState({
                          discussionDropdownOpen: !this.state.discussionDropdownOpen,
                        })
                      }
                    >
                      <DropdownToggle
                        className="btn header-item noti-icon"
                        tag="button"
                      >
                        <i className="bx bx-message-dots"></i>

                        <Link to="/approval-discussions">
                          <span
                            className="badge bg-danger rounded-pill"
                            style={{ cursor: "pointer" }}
                          >
                            {this.state.discussionCount}
                          </span>
                        </Link>
                      </DropdownToggle>
                    </Dropdown>
                  </div>
                </>
              )}

              {/* CEO REPLY NOTIFICATION — icon + count only, no navigation link */}
              {this.state.ceoDiscussionCount > 0 && (
                <>
                  <span className="blink-text">Replied</span>
                  <div className="dropdown d-inline-block">
                    <Dropdown
                      isOpen={this.state.ceoDropdownOpen}
                      toggle={() =>
                        this.setState({
                          ceoDropdownOpen: !this.state.ceoDropdownOpen,
                        })
                      }
                    >
                      <DropdownToggle
                        className="btn header-item noti-icon"
                        tag="button"
                      >
                        <i className="bx bx-message-dots"></i>
                        <span
                          className="badge bg-danger rounded-pill"
                          style={{ cursor: "default" }}
                        >
                          {this.state.ceoDiscussionCount}
                        </span>
                      </DropdownToggle>
                    </Dropdown>
                  </div>
                </>
              )}

              <ProfileMenu
                onChangePasswordClick={() =>
                  this.setState({ modalOpen: true })
                }
              />

              <PasswordModal
                isOpen={this.state.modalOpen}
                onClose={() => this.setState({ modalOpen: false })}
              />
            </div>
          </div>
        </header>
      </React.Fragment>
    );
  }
}

Header.propTypes = {
  t: PropTypes.any,
  toggleMenuCallback: PropTypes.any,
  showRightSidebar: PropTypes.any,
  toggleRightSidebar: PropTypes.func,
};

const mapStatetoProps = (state) => {
  const { layoutType, showRightSidebar } = state.Layout;
  return { layoutType, showRightSidebar };
};

export default connect(mapStatetoProps, { toggleRightSidebar })(
  withTranslation()(Header)
);
