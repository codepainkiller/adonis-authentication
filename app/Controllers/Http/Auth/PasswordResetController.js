'use strict'

const { validate, validateAll } = use('Validator')
const User = use('App/Models/User')
const PasswordReset = use('App/Models/PasswordReset')
const Mail = use('Mail')
const Hash = use('Hash')
const randomString = require('random-string')

class PasswordResetController {

    showLinkRequestForm({ view }) {
        return view.render('auth.passwords.email')
    }

    async sendRequestLinkEmail({ request, session, response }) {
        // validation form inputs
        const validation = await validate(request.only('email'), {
            email: 'required|email'
        })

        if (validation.fails()) {
            session.withErrors(validation.messages()).flashAll()

            return response.redirect('back')
        }

        try {
            const user = await User.findBy('email', request.input('email'))

            await PasswordReset.query().where('email', user.email).delete()

            const  { token } = await PasswordReset.create({
                email: user.email,
                token: randomString({ length: 40 })
            })

            const mailData = {
                user: user.toJSON(),
                token
            }

            await Mail.send('auth.emails.password_reset', mailData, message => {
                message.to(user.email)
                    .from('admin@adonisjs.com')
                    .subject('Password reset link')
            })

            session.flash({
                notification: {
                    type: 'success',
                    message: 'A password reset link has been sent to your email address.'
                }
            })
        } catch (error) {
            session.flash({
                notification: {
                    type: 'danger',
                    message: 'Sorry, there is no user with this email address.'
                }
            })
        }

        return response.redirect('back')
    }

    showResetForm({ params, view }) {
        return view.render('auth.passwords.reset', { token: params.token })
    }

    async reset({ request, session, response }) {
        const validation = await validateAll(request.all(), {
            token: 'required',
            email: 'required',
            password: 'required|confirmed'
        })

        if (validation.fails()) {
            session.withErrors(validation.messages()).flashExcept(['password', 'password_confirmation'])

            return response.redirect('back')
        }

        try {
            const user = await User.findBy('email', request.input('email'))
            const token = await PasswordReset.query()
                .where('email', user.email)
                .where('token', request.input('token'))
                .first()

            if (!token) {
                session.flash({
                    notification: {
                        type: 'danger',
                        message: 'This password reset token does not exist.'
                    }
                })

                return response.redirect('back')
            }

            // user.password = await Hash.make(request.input('password'))
            user.password = request.input('password')
            await user.save()

            // delete password reset token
            await PasswordReset.query().where('email', user.email).delete()

            // display success message
            session.flash({
                notification: {
                    type: 'success',
                    message: 'Your password has been reset!.'
                }
            })

            return response.redirect('/login')

        } catch (error) {
            session.flash({
                notification: {
                    type: 'danger',
                    message: 'Sorry, there is no user with this email address.'
                }
            })

            return response.redirect('back')
        }
    }
}

module.exports = PasswordResetController
