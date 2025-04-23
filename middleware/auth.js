function mockAuth(req, res, next) {
  req.user = {
    id: req.header("x-user-id"), // example: 'user123'
    role: req.header("x-user-role"), // example: 'admin' or 'user'
  };
  next();
}

// Check if user can view an image
function canViewImage(req, res, next) {
  // If user is admin, they can see all images
  if (req.user.role == "admin" || req.user.role == "fam" || req.user.role == "monica" ) {
    return next();
  }

  // Regular users can only see their own images
  if (
    req.user.id === req.params.userId ||
    req.image?.uploadedBy === req.user.id
  ) {
    return next();
  }

  return res
    .status(403)
    .json({ message: "Access denied: You can only view your own images" });
}

// Check if user can delete an image
function canDeleteImage(req, res, next) {
  // If user is admin, they can delete any image
  if (req.user.role === "admin") {
    return next();
  }

  // Regular users can only delete their own images
  if (
    req.user.id === req.params.userId ||
    req.image?.uploadedBy === req.user.id
  ) {
    return next();
  }

  return res
    .status(403)
    .json({ message: "Access denied: You can only delete your own images" });
}

module.exports = {
  mockAuth,
  canViewImage,
  canDeleteImage,
};
