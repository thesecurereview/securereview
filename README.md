# SecureReview

`SecureReview` is  a security mechanism that can be applied on top of a
Git-based code review system to ensure the integrity of the code review process
and provide verifiable guarantees that the code review process followed the
intended review policy.
<!--For more technical details, please refer to our paper
[Towards Verifiable Web-based Code Review Systems](https://securereview.github.io/assets/pub/afzali2021towards.pdf).-->
To achieve this goal, `SecureReview` provides three main features:
- __Sing Code Review Policy__: `SecureReview` allows the project owner to compute
a digital signature over the code review policy and store it on the code review server
so it can be later retrieved from the server to verify the integrity of the code review policy.
In order to store the signature, a check status and a code review label
are defined on Github and Gerrit, respectively.
- __Sing Code Reviews__: `SecureReview` encapsulates each review in a review unit
and embeds it in a Git commit message.
Each review unit contains the relevant information in the review, such as
the reviewer’s rating, reviewer's comment and a signature over the entire review unit.
- __Create a Verifable Chain of Reviews per Code Change__: Each review unit depends on
the prior review unit (i.e., includes the signature field of the previous review).
This property prevents unauthorized changes in the middle of the chain.

## Installation

`SecureReview` can be installed as an unpacked extension in the Chrome browser
as follows:

1. Download the latest version of the extension at the
[releases](https://github.com/thesecurereview/securereview/releases) section.

2. Unzip the extension.

2. On your Chrome browser, go to `chrome://extensions`.

3. Enable the `Developer mode`.

4. Click on `Load Unpacked` and select the Unzip folder.

To the best use of `SecureReview`, it is recommended that you take a look
at the [issue tracker](https://github.com/thesecurereview/securereview/issues)
before trying it out.


## Security Issues and Bugs

Security issues, bugs and feature requests can be reported through
GitHub [issue tracker](https://github.com/thesecurereview/securereview/issues).
Ideally, an issue documented as follows:
* Description of issue or feature request
* Current behavior
* Expected behavior


## Instructions for Contributors
Contributions can be made by submitting GitHub *Pull Requests*.


## License

Use of this source code is governed by the Licensed under the Apache License,
Version 2.0 that can be found in the
[LICENSE](https://github.com/thesecurereview/securereview/blob/master/LICENSE) file.


## Website
https://thesecurereview.github.io

## About

This project is managed by Prof. Reza Curtmola and other members of the
[NJIT Cybersecurity Research Center](https://centers.njit.edu/cybersecurity)
at NJIT and the [Secure Systems Lab](https://ssl.engineering.nyu.edu/) at NYU.


Contact: <hammad.afzali@gmail.com>
