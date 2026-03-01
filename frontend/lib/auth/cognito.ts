import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
} from 'amazon-cognito-identity-js';

const poolData = {
  UserPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || '',
  ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '',
};

export const userPool = new CognitoUserPool(poolData);

export const getCurrentUser = (): CognitoUser | null => {
  return userPool.getCurrentUser();
};

export const signIn = (email: string, password: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const authenticationDetails = new AuthenticationDetails({
      Username: email,
      Password: password,
    });

    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool,
    });

    cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: (result) => {
        resolve(result);
      },
      onFailure: (err) => {
        reject(err);
      },
    });
  });
};

export const signUp = (
  email: string,
  password: string
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const attributeList = [
      new CognitoUserAttribute({
        Name: 'email',
        Value: email,
      }),
    ];

    userPool.signUp(email, password, attributeList, [], (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(result);
    });
  });
};

export const confirmSignUp = (email: string, code: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool,
    });

    cognitoUser.confirmRegistration(code, true, (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(result);
    });
  });
};

export const resendConfirmationCode = (email: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool,
    });

    cognitoUser.resendConfirmationCode((err, result) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(result);
    });
  });
};

export const signOut = (): Promise<void> => {
  return new Promise((resolve) => {
    const cognitoUser = getCurrentUser();
    if (cognitoUser) {
      cognitoUser.signOut();
    }
    resolve();
  });
};

export const forgotPassword = (email: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool,
    });

    cognitoUser.forgotPassword({
      onSuccess: (result) => {
        resolve(result);
      },
      onFailure: (err) => {
        reject(err);
      },
    });
  });
};

export const confirmPassword = (
  email: string,
  code: string,
  newPassword: string
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool,
    });

    cognitoUser.confirmPassword(code, newPassword, {
      onSuccess: () => {
        resolve('Password confirmed');
      },
      onFailure: (err) => {
        reject(err);
      },
    });
  });
};

export const getSession = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    const cognitoUser = getCurrentUser();
    if (!cognitoUser) {
      reject(new Error('No current user'));
      return;
    }

    cognitoUser.getSession((err: any, session: any) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(session);
    });
  });
};

export const getIdToken = async (): Promise<string | null> => {
  try {
    const session = await getSession();
    return session.getIdToken().getJwtToken();
  } catch (error) {
    return null;
  }
};
