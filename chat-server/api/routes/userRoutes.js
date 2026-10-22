const express = require("express");
const router = express.Router();

router.get("/", (req, res) => res.send("Reading users"));
router.get("/:id", (req, res) => res.send(`Reading an user with id: ${req.params.id}`));
router.post("/", (req, res) => res.send("Creating an user"));
router.put("/:id", (req, res) => res.send(`Updating an user with id: ${req.params.id}`));
router.delete("/:id", (req, res) => res.send(`Deleting an user with id: ${req.params.id}`));

module.exports = router;
