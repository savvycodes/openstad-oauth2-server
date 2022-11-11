# Changelog

## v0.40.0
Update version number

## 0.19.0
* Make the email url brute force more restrictive

## 0.18.0
* Remove password from return hashed in GET 

## 0.17.0
* Refactor logic so admin can login with both Password and Login via E-mail

## v0.16.0 (2020-07-20)
* Add external CSRF token

## v0.15.1 (2020-06-15)
* Fix password login redirect url on return

## v0.15.0 (2020-06-08)
* Add phone number label
* Don't invalid login token after making a new request, until login is successful
* A login email link is valid max 10 minutes

## v0.14.2 (2020-05-26)
* Change phone number format to +31 for sending SMS

## v0.14.1 (2020-05-15)
* Add empty layout option for emails so complete email can be set
* Add logo specific for email only in config
* Make loader text fields configurable

## v0.14.0 (2020-04-26)
* Add 2 factor auth, configurable per role and client (site)

## v0.13.0 (2020-03-17)
* Add ellipsis css to login url in email so it will be cut off

## v0.12.0 (2020-02-23)
* In case password is not set create a random one when creating a user

## v0.11.0 (2020-01-27)
* Fallback to roleId for member uniqueCode if none defaultRoleId is set
* In case password is not set create a random one

## v0.10.0 (2020-12-09)
* Add client name to the page title, and client site URL to the logo href
* Add a favicon that can be overwritten in the client config
* Allow labels of required fields to be changed through the client config

## v0.9.0
* Update NPM modules for security

## v0.8.0 (2020-17-07)

* Alter tables with foreign keys to user from delete restrict to delete cascade, meaning they automatically get deleted

## 0.7.2 (2020-10-08)
* Update Openstad logo

## 0.7.1 (2020-09-15)
* Sender in email fell back to null null, Add check to make sure firstName / lastName exists in order to prevent casting null to string

## 0.7.0 (2020-09-15)
* Start of using version numbers in changelog
