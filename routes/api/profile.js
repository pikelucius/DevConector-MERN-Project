const express = require("express");
const request = require('request');
const config = require('config');

const router = express.Router();
const auth = require("../../middleware/auth");
const { check, validationResult } = require("express-validator");
const Profile = require("../../models/Profile");
const User = require("../../models/User");

// @route  GET api/profile/me
// @desc   Get current users profile
// @access Private
router.get("/me", auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({
      user: req.user.id,
    }).populate("user", ["name", "avatar"]);

    if (!profile) {
      return res.status(400).json({ msg: "There is no profile for this user" });
    }

    res.json(profile);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
});

// @route  POST api/profile
// @desc   Create or update a user profile
// @access Private
router.post(
  "/",
  [
    auth,
    [
      check("status", "Status is required").not().isEmpty(),
      check("skills", "Skills is required").not().isEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // destructure the request
    const {
      website,
      skills,
      youtube,
      twitter,
      instagram,
      linkedin,
      facebook,
      // spread the rest of the fields we don't need to check
      ...rest
    } = req.body;

    // build a profile
    const profileFields = {
      user: req.user.id,
      website:
        website && website !== ""
          ? normalize(website, { forceHttps: true })
          : "",
      skills: Array.isArray(skills)
        ? skills
        : skills.split(",").map((skill) => " " + skill.trim()),
      ...rest,
    };

    // Build socialFields object
    const socialFields = { youtube, twitter, instagram, linkedin, facebook };

    // normalize social fields to ensure valid url
    for (const [key, value] of Object.entries(socialFields)) {
      if (value && value.length > 0)
        socialFields[key] = normalize(value, { forceHttps: true });
    }
    // add to profileFields
    profileFields.social = socialFields;

    try {
      // Using upsert option (creates new doc if no match is found):
      let profile = await Profile.findOneAndUpdate(
        { user: req.user.id },
        { $set: profileFields },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
    //   // Create
    //   profile = new Profile(profileFields);

    //   await profile.save();
      return res.json(profile);
    } catch (err) {
      console.error(err.message);
      return res.status(500).send("Server Error");
    }
  }
);

// @route  GET api/profile
// @desc   Get all profiles
// @access Public
router.get('/', async (req, res) => {
  try {
      const profiles = await Profile.find().populate('user', ['name', 'avatar'])
      res.json(profiles)
  } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error')
  }
})

// @route  GET api/profile/user/:user_id
// @desc   Get profile by user ID
// @access Public
router.get('/user/:user_id', async (req, res) => {
    try {
        const profile = await Profile.findOne({ user: req.params.user_id }).populate('user', ['name', 'avatar'])

        if(!profile) return res.status(400).json({ msg: 'Profile not found'})
        return res.json(profile)
    } catch (err) {
        console.error(err.message);
        if(err.kind == 'ObjectId') {
            return res.status(400).json({ msg: 'Profile not found'})
        }
        res.status(500).send('Server Error')
    }
  })

// @route  DELETE api/profile
// @desc   Delete profile, user, posts
// @access Private
router.delete('/', auth,  async (req, res) => {
    try {
        // @todo - remove users posts

        // Remove profile
       await Profile.findOneAndRemove({ user: req.user.id })
        // Remove user

       await User.findOneAndRemove({ _id: req.user.id })

        res.json({ msg: 'User deleted' })
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error')
    }
  })
  
// @route  PUT api/profile/experience
// @desc   Add profile experience
// @access Private
router.put('/experience', [auth, [
    check('title', 'Title is required').not().isEmpty(),
    check('company', 'Company is required').not().isEmpty(),
    check('from', 'From date is required').not().isEmpty()
]], async (req, res) => {
  const errors = validationResult(req)
  if(!errors.isEmpty()){
      return res.status(400).json({ errors: errors.array() })
  }

  const {
      title,
      company,
      location,
      from,
      to,
      current,
      decription
  } = req.body
  
  const newExp = {
    title,
    company,
    location,
    from,
    to,
    current,
    decription
  }

  try {
      const profile = await Profile.findOne({ user: req.user.id })

      profile.experience.unshift(newExp)
      await profile.save()
      res.json(profile)
  } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error')
  }
})

// @route  DELETE api/profile/experience/:exp_id
// @desc   Delete experience from profile
// @access Private
router.delete('/experience/:exp_id', auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id })

    profile.experience = profile.experience.filter(
        (item) => item._id.toString() !== req.params.exp_id
      );

    await profile.save()
    res.json(profile)
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error')
  }
})

// @route  PUT api/profile/education
// @desc   Add profile education
// @access Private
router.put('/education', [auth, [
    check('school', 'School is required').not().isEmpty(),
    check('degree', 'Degree is required').not().isEmpty(),
    check('fieldofstudy', 'Field of study is required').not().isEmpty(),
    check('from', 'From date is required').not().isEmpty()
]], async (req, res) => {
  const errors = validationResult(req)
  if(!errors.isEmpty()){
      return res.status(400).json({ errors: errors.array() })
  }

  const {
      school,
      degree,
      fieldofstudy,
      from,
      to,
      current,
      decription
  } = req.body
  
  const newEdu = {
    school,
    degree,
    fieldofstudy,
    from,
    to,
    current,
    decription
  }

  try {
      const profile = await Profile.findOne({ user: req.user.id })

      profile.education.unshift(newEdu)
      await profile.save()
      res.json(profile)
  } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error')
  }
})

// @route  DELETE api/profile/education/:edu_id
// @desc   Delete education from profile
// @access Private
router.delete('/education/:edu_id', auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id })

    profile.education = profile.education.filter(
        (item) => item._id.toString() !== req.params.edu_id
      );

    await profile.save()
    res.json(profile)
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error')
  }
})

// @route  GET api/profile/github/:username
// @desc   Get education from profile
// @access Public
router.get('/github/:username', (req, res) => {
  try {
      const options = {
        uri: encodeURI(
            `https://api.github.com/users/${req.params.username}/repos?per_page=5&sort=created:asc`
          ),
          method: 'GET',
          headers: {
            'user-agent': 'node.js',
            Authorization: `token ${config.get('githubToken')}`
          }
      }
      request(options, (error, response, body) => {
          if(error) console.error(error);
          if(response.statusCode !== 200) {
              res.status(404).json({ msg: 'No Github profile found' })
          }
          
          res.json(JSON.parse(body))
      })
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error')
  }
})
module.exports = router;
