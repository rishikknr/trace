import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
afterEach(cleanup);
// Modal semantics and native focus trapping are verified in the real browser suite.
HTMLDialogElement.prototype.showModal = function () {
  this.open = true;
};
HTMLDialogElement.prototype.close = function () {
  this.open = false;
};
